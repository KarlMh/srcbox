import { create } from 'zustand';
import { Note, NoteInput, Box } from '../types/note';
import { notesDb } from '../db/database';
import { fileSystemStorage } from '../services/fileSystemService';

interface NotesState {
  notes: Note[];
  boxes: Box[];
  currentNote: Note | null;
  searchQuery: string;
  selectedTag: string | null;
  isLoading: boolean;
  isFileSystemInitialized: boolean;
  autoReconnectDone: boolean;
  showFolderSelectionModal: boolean;
  pendingNoteCreation: boolean;
  pendingNoteBox: string | null;
  trashedNotes: Note[];
  loadTrashedNotes: () => Promise<void>;
  expandedBoxes: Record<string, boolean>;
  toggleBoxExpanded: (path: string) => void;
  openFoldersForTag: (tag: string) => Promise<void>;

  // Actions
  loadNotes: () => Promise<void>;
  refreshNotes: () => void;
  loadBoxes: () => Promise<void>;
  createNote: (input?: NoteInput) => Promise<Note>;
  updateNote: (id: string, updates: Partial<NoteInput>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  softDeleteNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  permanentDeleteNote: (id: string) => Promise<void>;
  moveNote: (id: string, targetBoxPath: string | null) => Promise<void>;
  moveBox: (boxPath: string, targetParentPath: string | null) => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string | null) => void;
  createBox: (parentPath: string | null, name: string) => Promise<Box>;
  renameBox: (boxPath: string, newName: string) => Promise<void>;
  deleteBox: (boxPath: string) => Promise<void>;
  autoReconnect: () => Promise<void>;
  initializeFileSystem: () => Promise<boolean>;
  showFolderSelection: (boxPath?: string | null) => void;
  hideFolderSelection: () => void;
  handleFolderSelected: () => Promise<void>;
}

let loadNotesRequestId = 0;

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  boxes: [],
  currentNote: null,
  searchQuery: '',
  selectedTag: null,
  isLoading: false,
  isFileSystemInitialized: false,
  autoReconnectDone: false,
  showFolderSelectionModal: false,
  pendingNoteCreation: false,
  pendingNoteBox: null,
  trashedNotes: [],
  expandedBoxes: {},

  loadNotes: async () => {
    if (!get().isFileSystemInitialized) {
      set({ isLoading: false });
      return;
    }
    const requestId = ++loadNotesRequestId;
    set({ isLoading: true });
    try {
      const { searchQuery, selectedTag } = get();
      let notes: Note[];

      if (searchQuery) {
        notes = await notesDb.searchNotes(searchQuery);
      } else if (selectedTag) {
        notes = await notesDb.getNotesByTag(selectedTag);
      } else {
        notes = await notesDb.getActiveNotes();
      }

      if (requestId !== loadNotesRequestId) return;
      set({ notes, isLoading: false });
    } catch (error) {
      if (requestId !== loadNotesRequestId) return;
      console.error('Error loading notes:', error);
      set({ isLoading: false });
    }
  },

  refreshNotes: () => {
    // Near-instant for Obsidian feel
    requestAnimationFrame(async () => {
      await get().loadNotes();
    });
  },

  loadTrashedNotes: async () => {
    try {
      const notes = await notesDb.getTrashedNotes();
      set({ trashedNotes: notes.sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()) });
    } catch (error) {
      console.error('Error loading trashed notes:', error);
    }
  },

  loadBoxes: async () => {
    if (!get().isFileSystemInitialized) return;
    try {
      const boxes = await notesDb.getBoxes();
      const expandedBoxes: Record<string, boolean> = {};
      boxes.forEach(b => {
        expandedBoxes[b.path] = true;
      });
      set({ boxes, expandedBoxes });
    } catch (error) {
      console.error('Error loading boxes:', error);
    }
  },

  createNote: async (input = { title: '', content: '' }) => {
    if (!get().isFileSystemInitialized) {
      get().showFolderSelection(input.boxPath ?? null);
      throw new Error('Please select a folder first');
    }
    const note = await notesDb.createNote(input);
    set((state) => ({
      notes: [note, ...state.notes.filter((n) => n._id !== note._id)],
      currentNote: note,
    }));
    get().refreshNotes();
    return note;
  },

  updateNote: async (id, updates) => {
    if (!get().isFileSystemInitialized) {
      console.warn('Skipping update - FS not ready');
      return Promise.resolve();
    }
    try {
      const updated = await notesDb.updateNote(id, updates);
      set((state) => ({
        notes: state.notes.map((n) => (n._id === id ? updated : n)),
        currentNote: state.currentNote?._id === id ? updated : state.currentNote,
      }));
      get().refreshNotes();
      return Promise.resolve();
    } catch (error) {
      console.error('Error updating note:', error);
      get().refreshNotes();
      return Promise.reject(error);
    }
  },

  deleteNote: async (id) => {
    await notesDb.deleteNote(id);
    if (get().currentNote?._id === id) set({ currentNote: null });
    get().refreshNotes();
  },

  softDeleteNote: async (id) => {
    const note = get().notes.find(n => n._id === id);
    if (!note) {
      // Note not in active list, reload trashed to be safe
      await get().loadTrashedNotes();
      return;
    }
    try {
      await notesDb.softDeleteNote(id);
    } catch (error) {
      console.error('Soft delete failed:', error);
      return;
    }
    set((state) => ({
      notes: state.notes.filter((n) => n._id !== id),
      currentNote: state.currentNote?._id === id ? null : state.currentNote,
      trashedNotes: [...state.trashedNotes, {...note, deletedAt: new Date().toISOString()}],
    }));
  },

  restoreNote: async (id) => {
    await notesDb.restoreNote(id);
    set((state) => ({
      trashedNotes: state.trashedNotes.filter((n) => n._id !== id),
    }));
    get().refreshNotes();
  },

  permanentDeleteNote: async (id) => {
    set((state) => ({
      notes: state.notes.filter((n) => n._id !== id),
      trashedNotes: state.trashedNotes.filter((n) => n._id !== id),
    }));
    await notesDb.deleteNote(id);
    get().refreshNotes();
  },

  moveNote: async (id, targetBoxPath) => {
    const existing = get().notes.find((n) => n._id === id) ?? (await notesDb.getNote(id));
    if (existing && (existing.boxPath ?? null) === targetBoxPath) return;

    const updated = await notesDb.moveNote(id, targetBoxPath);
    set((state) => ({
      notes: state.notes.map((n) => (n._id === id ? updated : n)),
      currentNote: state.currentNote?._id === id ? updated : state.currentNote,
    }));
    get().refreshNotes();
  },

  moveBox: async (boxPath, targetParentPath) => {
    const newPath = await notesDb.moveBox(boxPath, targetParentPath);
    if (newPath === boxPath) return;

    await get().loadBoxes();
    set((state) => {
      const remapBoxPath = (noteBoxPath: string | null): string | null => {
        if (!noteBoxPath) return noteBoxPath;
        if (noteBoxPath === boxPath) return newPath;
        if (noteBoxPath.startsWith(boxPath + '/')) {
          return newPath + noteBoxPath.slice(boxPath.length);
        }
        return noteBoxPath;
      };

      const updatedCurrentNote =
        state.currentNote == null
          ? null
          : { ...state.currentNote, boxPath: remapBoxPath(state.currentNote.boxPath) };

      return {
        notes: state.notes.map((note) => ({
          ...note,
          boxPath: remapBoxPath(note.boxPath),
        })),
        currentNote: updatedCurrentNote,
      };
    });

    get().refreshNotes();
  },

  setCurrentNote: (note) => set({ currentNote: note }),

  setSearchQuery: (query) => {
    set({ searchQuery: query, selectedTag: null });
    get().loadNotes();
  },

  setSelectedTag: (tag) => {
    set({ selectedTag: tag, searchQuery: '' });
    get().loadNotes();
  },

  createBox: async (parentPath, name) => {
    const box = await notesDb.createBox(parentPath, name);
    set((state) => ({ boxes: [...state.boxes, box] }));
    return box;
  },

  renameBox: async (boxPath, newName) => {
    const newPath = await notesDb.renameBox(boxPath, newName);
    await get().loadBoxes();
    set((state) => ({
      notes: state.notes.map((n) => {
        if (!n.boxPath) return n;
        if (n.boxPath === boxPath) return { ...n, boxPath: newPath };
        if (n.boxPath.startsWith(boxPath + '/'))
          return { ...n, boxPath: newPath + n.boxPath.slice(boxPath.length) };
        return n;
      }),
    }));
  },

  deleteBox: async (boxPath) => {
    // Permanent delete all notes (active + trashed) in this box and subfolders
    const activeNotes = await notesDb.getActiveNotes();
    const trashedNotes = await notesDb.getTrashedNotes();
    const allNotesInBox = [
      ...activeNotes,
      ...trashedNotes
    ].filter(n => n.boxPath === boxPath || (n.boxPath && n.boxPath.startsWith(boxPath + '/')));
    for (const note of allNotesInBox) {
      await notesDb.deleteNote(note._id);
    }
    
    await notesDb.deleteBox(boxPath);
    set((state) => ({
      boxes: state.boxes.filter((b) => b.path !== boxPath && !b.path.startsWith(boxPath + '/')),
    }));
    get().refreshNotes();
    get().loadBoxes();
  },

  autoReconnect: async () => {
    try {
      const restored = await fileSystemStorage.tryRestoreConnection();
      if (restored) {
        set({ isFileSystemInitialized: true, autoReconnectDone: true });
        await Promise.all([get().loadNotes(), get().loadBoxes()]);
      } else {
        set({ autoReconnectDone: true });
      }
    } catch (error) {
      console.error('Error auto-reconnecting:', error);
      set({ autoReconnectDone: true });
    }
  },

  initializeFileSystem: async () => {
    try {
      const result = await fileSystemStorage.initialize();
      set({ isFileSystemInitialized: result });
      return result;
    } catch (error) {
      console.error('Error initializing file system:', error);
      set({ isFileSystemInitialized: false });
      return false;
    }
  },

  showFolderSelection: (boxPath = null) => {
    set({ showFolderSelectionModal: true, pendingNoteCreation: true, pendingNoteBox: boxPath });
  },

  hideFolderSelection: () => {
    set({ showFolderSelectionModal: false, pendingNoteCreation: false, pendingNoteBox: null });
  },

  handleFolderSelected: async () => {
    try {
      const result = await fileSystemStorage.initialize();
      const { pendingNoteCreation, pendingNoteBox } = get();
      set({ isFileSystemInitialized: result, showFolderSelectionModal: false, pendingNoteCreation: false, pendingNoteBox: null });

      if (result) {
        await Promise.all([get().loadBoxes(), get().loadNotes()]);
        if (pendingNoteCreation) {
          const note = await notesDb.createNote({ title: '', content: '', boxPath: pendingNoteBox });
          set((state) => ({
            notes: [note, ...state.notes.filter((n) => n._id !== note._id)],
            currentNote: note,
          }));
          await get().loadNotes();
        }
      }
    } catch (error) {
      console.error('Error initializing file system:', error);
      set({ isFileSystemInitialized: false, showFolderSelectionModal: false, pendingNoteCreation: false, pendingNoteBox: null });
    }
  },

  toggleBoxExpanded: (path: string) => {
    set((state) => ({
      expandedBoxes: {
        ...state.expandedBoxes,
        [path]: !(state.expandedBoxes[path] ?? false)
      }
    }));
  },

  openFoldersForTag: async (tag: string) => {
    const allNotes = await notesDb.getActiveNotes();
    const boxes = get().boxes;
    const tagBoxPaths = new Set<string>();
    for (const note of allNotes) {
      if (note.tags.includes(tag)) {
        let current: string | null = note.boxPath ?? null;
        while (current) {
          tagBoxPaths.add(current);
          const parts = current.split('/');
          current = parts.length > 1 ? parts.slice(0, -1).join('/') : null;
        }
      }
    }
    const newExpanded: Record<string, boolean> = {};
    boxes.forEach((b) => {
      newExpanded[b.path] = !tagBoxPaths.has(b.path);
    });
    set({ expandedBoxes: newExpanded });
  },
}));

