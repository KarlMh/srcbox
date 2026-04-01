import { Note, NoteInput, Box } from '../types/note';
import { createSlug } from '../utils/slug';

interface FileSystemState {
  rootPath: string | null;
  isInitialized: boolean;
}

const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.selectFolder;
declare global {
  interface Window {
    electronAPI: any;
  }
}

function serializeNote(note: Note): string {
  const lines = [
    '---',
    `_id: ${note._id}`,
    `slug: ${note.slug}`,
    `title: ${note.title}`,
    `tags: ${note.tags.join(', ')}`,
    `deletedAt: ${note.deletedAt ?? 'null'}`,
    `createdAt: ${note.createdAt}`,
    `updatedAt: ${note.updatedAt}`,
    `type: note`,
    '---',
    '',
    note.content,
  ];
  return lines.join('\n');
}

class FileSystemStorage {
  private cache = new Map<string, Note>();

  state: FileSystemState = {
    rootPath: null,
    isInitialized: false,
  };

  // ── Initialization ──────────────────────────────────────────────────────────

  async initialize(): Promise<boolean> {
    try {
      if (isElectron) {
        const result = await (window as any).electronAPI.selectFolder();
        if (result.success && !result.canceled) {
          this.state.rootPath = result.path;
          this.state.isInitialized = true;
          this.cache.clear();
          localStorage.setItem('srcbox-folder-path', result.path);
          return true;
        }
        return false;
      } else {
        const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        this.state.rootPath = handle.name;
        this.state.isInitialized = true;
        this.cache.clear();
        localStorage.setItem('srcbox-directory-handle', 'true');
        return true;
      }
    } catch (error) {
      console.error('Failed to initialize file system:', error);
      return false;
    }
  }

  async tryRestoreConnection(): Promise<boolean> {
    if (this.state.isInitialized && this.state.rootPath) return true;

    const storedPath = localStorage.getItem('srcbox-folder-path');
    if (storedPath && isElectron) {
      const result = await (window as any).electronAPI.checkFolderAccess(storedPath);
      if (result.accessible) {
        this.state.rootPath = storedPath;
        this.state.isInitialized = true;
        return true;
      }
      localStorage.removeItem('srcbox-folder-path');
    }
    return false;
  }

  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private get root(): string {
    if (!this.state.rootPath) {
      console.warn('FS root not available, using fallback');
      return '';
    }
    return this.state.rootPath;
  }

  private async saveNoteToFile(note: Note): Promise<void> {
    if (isElectron && this.root) {
      await (window as any).electronAPI.writeNote(
        this.root,
        note._id,
        note.boxPath ?? null,
        serializeNote(note)
      );
    } else {
      console.warn('Save skipped - not Electron or no root');
    }
  }

  // ── Notes ───────────────────────────────────────────────────────────────────

  async createNote(input: NoteInput): Promise<Note> {
    const now = new Date().toISOString();
    const title = input.title || 'Untitled';
    let slug = createSlug(title);

    // Check for collision
    const allNotes = await this.getAllNotes();
    let counter = 1;
    while (allNotes.some(n => n.slug === slug)) {
      slug = createSlug(title + '-' + counter);
      counter++;
    }

    const note: Note = {
      _id: slug,
      slug: slug,
      title,
      content: input.content || '',
      tags: input.tags || [],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      type: 'note',
      boxPath: input.boxPath ?? null,
    };
    await this.saveNoteToFile(note);
    this.cache.set(note._id, note);
    return note;
  }

  async getAllNotes(): Promise<Note[]> {
    if (!this.state.isInitialized || !isElectron || !window.electronAPI) {
      return [];
    }
    try {
      const result = await (window as any).electronAPI.readNotes(this.root);
      if (result.success) {
        const sortedNotes = (result.notes as Note[])
          .map(n => ({ ...n, tags: Array.isArray(n.tags) ? n.tags : [] }))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        sortedNotes.forEach((note) => this.cache.set(note._id, note));
        return sortedNotes;
      }
      return [];
    } catch {
      return [];
    }
  }

  async getNote(id: string): Promise<Note | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    if (!this.state.isInitialized) {
      return null;
    }
    const note = await this.getAllNotes().then(all => all.find((n) => n._id === id) ?? null);
    if (note) {
      this.cache.set(id, note);
    }
    return note;
  }

  async updateNote(id: string, updates: Partial<NoteInput>): Promise<Note> {
    if (!this.state.isInitialized) {
      throw new Error('File system not ready for update');
    }
    const existing = await this.getNote(id);
    if (!existing) {
      console.warn(`Note ${id} not found for update (FS:${this.state.rootPath})`);
      throw new Error('Note not found');
    }
    const updated: Note = { ...existing, ...(updates as Partial<Note>), updatedAt: new Date().toISOString() };

    // Update filename when title changes
    if ('title' in updates && updates.title && updates.title !== existing.title) {
      const newSlug = createSlug(updates.title as string);
      const allNotes = await this.getAllNotes();
      let counter = 1;
      let candidate = newSlug;
      while (allNotes.some(n => n._id === candidate && n._id !== id)) {
        candidate = createSlug(`${updates.title as string}-${counter}`);
        counter++;
      }

      updated.slug = candidate;
      updated._id = candidate;

      // Rename file
      if (isElectron && (window.electronAPI as any).renameNoteFile) {
        const oldFilename = `${id}.md`;
        const newFilename = `${candidate}.md`;
        try {
          await (window.electronAPI as any).renameNoteFile(this.root, oldFilename, newFilename, existing.boxPath ?? null);
        } catch (renameError) {
          console.warn('Rename failed:', renameError);
        }
      }
    }

    await this.saveNoteToFile(updated);
    this.cache.set(updated._id, updated);
    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    const note = await this.getNote(id);
    this.cache.delete(id);
    if (isElectron) {
      await (window as any).electronAPI.deleteNote(this.root, id, note?.boxPath ?? null);
    } else {
      throw new Error('Web file system not implemented');
    }
  }

  async softDeleteNote(id: string): Promise<Note> {
    return this.updateNote(id, { deletedAt: new Date().toISOString() } as any);
  }

  async restoreNote(id: string): Promise<Note> {
    return this.updateNote(id, { deletedAt: null } as any);
  }

  async moveNote(id: string, targetBoxPath: string | null): Promise<Note> {
    const note = await this.getNote(id);
    if (!note) throw new Error('Note not found');
    if ((note.boxPath ?? null) === targetBoxPath) return note;

    if (isElectron) {
      await (window as any).electronAPI.moveNote(this.root, id, note.boxPath ?? null, targetBoxPath);
    } else {
      throw new Error('Web file system not implemented');
    }
    const updated: Note = { ...note, boxPath: targetBoxPath, updatedAt: new Date().toISOString() };
    await this.saveNoteToFile(updated);
    this.cache.set(updated._id, updated);
    return updated;
  }

  async moveBox(boxPath: string, targetParentPath: string | null): Promise<string> {
    const normalizedTargetParent = targetParentPath && targetParentPath.trim().length > 0
      ? targetParentPath
      : null;

    const segments = boxPath.split('/').filter(Boolean);
    const boxName = segments[segments.length - 1];
    if (!boxName) {
      throw new Error('Invalid box path');
    }

    const currentParent = segments.length > 1 ? segments.slice(0, -1).join('/') : null;
    if (currentParent === normalizedTargetParent) {
      return boxPath;
    }

    if (normalizedTargetParent && (normalizedTargetParent === boxPath || normalizedTargetParent.startsWith(boxPath + '/'))) {
      throw new Error('Cannot move a box into itself');
    }

    const newPath = normalizedTargetParent ? `${normalizedTargetParent}/${boxName}` : boxName;

    if (newPath === boxPath) {
      return boxPath;
    }

    if (isElectron) {
      const result = await (window as any).electronAPI.moveFolder(this.root, boxPath, normalizedTargetParent);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to move box');
      }
      return (result.newPath as string) || newPath;
    }

    throw new Error('Web file system not implemented');
  }

  async getActiveNotes(): Promise<Note[]> {
    const all = await this.getAllNotes();
    return all.filter((n) => !n.deletedAt);
  }

  private trashedCache: Note[] = [];
  private lastTrashScan = 0;

  async getTrashedNotes(): Promise<Note[]> {
    const now = Date.now();
    if (now - this.lastTrashScan < 2000 && this.trashedCache.length) {
      return this.trashedCache;
    }
    const all = await this.getAllNotes();
    this.trashedCache = all.filter((n) => n.deletedAt !== null);
    this.lastTrashScan = now;
    return this.trashedCache;
  }

  async searchNotes(query: string): Promise<Note[]> {
    const active = await this.getActiveNotes();
    const q = query.toLowerCase();
    return active.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  async getNotesByTag(tag: string): Promise<Note[]> {
    const active = await this.getActiveNotes();
    return active.filter((n) => n.tags.includes(tag));
  }

  async getAllTags(): Promise<string[]> {
    const active = await this.getActiveNotes();
    const set = new Set<string>();
    active.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }

  // ── Boxes ────────────────────────────────────────────────────────────────────

  async getBoxes(): Promise<Box[]> {
    if (!this.state.isInitialized || !isElectron || !window.electronAPI) {
      return [];
    }
    try {
      const result = await (window as any).electronAPI.readFolders(this.root);
      if (result.success) return result.folders as Box[];
      return [];
    } catch {
      return [];
    }
  }

  async createBox(parentPath: string | null, name: string): Promise<Box> {
    if (isElectron) {
      const result = await (window as any).electronAPI.createFolder(this.root, parentPath, name);
      if (result.success) return result.folder as Box;
      throw new Error(result.error || 'Failed to create box');
    }
    throw new Error('Web file system not implemented');
  }

  async renameBox(boxPath: string, newName: string): Promise<string> {
    if (isElectron) {
      const result = await (window as any).electronAPI.renameFolder(this.root, boxPath, newName);
      if (result.success) return result.newPath as string;
      throw new Error(result.error || 'Failed to rename box');
    }
    throw new Error('Web file system not implemented');
  }

  async deleteBox(boxPath: string): Promise<void> {
    if (isElectron) {
      const result = await (window as any).electronAPI.deleteFolder(this.root, boxPath);
      if (!result.success) throw new Error(result.error || 'Failed to delete box');
    } else {
      throw new Error('Web file system not implemented');
    }
  }
}

export const fileSystemStorage = new FileSystemStorage();
