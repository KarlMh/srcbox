import { Note } from '../../types/note';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useNotesStore } from '../../stores/notesStore';
import { formatDistanceToNow } from '../../utils/date';

interface TrashNoteItemProps {
  note: Note;
  indentLevel?: number;
  onRequestDelete: () => void;
}

export function TrashNoteItem({ note, indentLevel = 0, onRequestDelete }: TrashNoteItemProps) {
  const { restoreNote } = useNotesStore();

  return (
    <div
      className="group"
      style={{ paddingLeft: indentLevel * 12 }}
    >
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-muted/50 border border-border rounded-xl">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate mb-1">
            {note.title || 'Untitled'}
          </h3>
          <p className="text-xs text-muted-foreground">
            Deleted {formatDistanceToNow(note.deletedAt!)}
          </p>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => restoreNote(note._id)}
            className="px-3 py-2 text-sm bg-background border border-border hover:bg-muted rounded-lg transition-colors flex items-center gap-1.5"
            title="Restore"
          >
            <RotateCcw className="h-4 w-4" />
            Restore
          </button>
          <button
            onClick={onRequestDelete}
            className="px-3 py-2 text-sm bg-background border border-border hover:bg-destructive/10 rounded-lg text-destructive transition-colors flex items-center gap-1.5"
            title="Delete permanently"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
