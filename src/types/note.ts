export interface Note {
  _id: string;
  slug: string;
  title: string;
  content: string;
  tags: string[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  type: 'note';
  boxPath: string | null;
}

export interface NoteInput {
  title: string;
  content: string;
  tags?: string[];
  boxPath?: string | null;
  deletedAt?: string | null;
}

export interface Box {
  id: string;
  name: string;
  path: string;
  parentPath: string | null;
}
