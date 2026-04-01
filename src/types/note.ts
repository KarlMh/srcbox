export interface Note {
  _id: string;
  slug: string;
  _rev?: string;
  title: string;
  content: string;
  tags: string[];
  pinned?: boolean;
  favorited?: boolean;
  archived?: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  type: 'note';
  boxPath: string | null; // relative path from root inside srcbox folder, null = root
}

export interface NoteInput {
  title: string;
  content: string;
  tags?: string[];
  boxPath?: string | null;
  deletedAt?: string | null;
}

export interface Box {
  id: string;          // same as path
  name: string;        // display name (last path segment)
  path: string;        // relative from root, forward slashes e.g. "Work" or "Work/Projects"
  parentPath: string | null;
}

export interface SyncConfig {
  remoteUrl: string;
  enabled: boolean;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';
