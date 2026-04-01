import { Note, NoteInput, Box } from '../types/note';
import { fileSystemStorage } from '../services/fileSystemService';

class NotesDatabase {
  async initialize(): Promise<boolean> {
    return fileSystemStorage.initialize();
  }

  async createNote(input: NoteInput): Promise<Note> {
    return fileSystemStorage.createNote(input);
  }

  async getNote(id: string): Promise<Note | null> {
    return fileSystemStorage.getNote(id);
  }

  async updateNote(id: string, updates: Partial<NoteInput>): Promise<Note> {
    return fileSystemStorage.updateNote(id, updates);
  }

  async deleteNote(id: string): Promise<void> {
    return fileSystemStorage.deleteNote(id);
  }

  async softDeleteNote(id: string): Promise<Note> {
    return fileSystemStorage.softDeleteNote(id);
  }

  async restoreNote(id: string): Promise<Note> {
    return fileSystemStorage.restoreNote(id);
  }

  async moveNote(id: string, targetBoxPath: string | null): Promise<Note> {
    return fileSystemStorage.moveNote(id, targetBoxPath);
  }

  async moveBox(boxPath: string, targetParentPath: string | null): Promise<string> {
    return fileSystemStorage.moveBox(boxPath, targetParentPath);
  }

  async getAllNotes(): Promise<Note[]> {
    return fileSystemStorage.getAllNotes();
  }

  async getActiveNotes(): Promise<Note[]> {
    return fileSystemStorage.getActiveNotes();
  }

  async getTrashedNotes(): Promise<Note[]> {
    return fileSystemStorage.getTrashedNotes();
  }

  async searchNotes(query: string): Promise<Note[]> {
    return fileSystemStorage.searchNotes(query);
  }

  async getNotesByTag(tag: string): Promise<Note[]> {
    return fileSystemStorage.getNotesByTag(tag);
  }

  async getAllTags(): Promise<string[]> {
    return fileSystemStorage.getAllTags();
  }

  // Boxes
  async getBoxes(): Promise<Box[]> {
    return fileSystemStorage.getBoxes();
  }

  async createBox(parentPath: string | null, name: string): Promise<Box> {
    return fileSystemStorage.createBox(parentPath, name);
  }

  async renameBox(boxPath: string, newName: string): Promise<string> {
    return fileSystemStorage.renameBox(boxPath, newName);
  }

  async deleteBox(boxPath: string): Promise<void> {
    return fileSystemStorage.deleteBox(boxPath);
  }

  isInitialized(): boolean {
    return fileSystemStorage.isInitialized();
  }
}

export const notesDb = new NotesDatabase();
