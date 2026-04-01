import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Note } from '../../types/note';
import { useNotesStore } from '../../stores/notesStore';
import { Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { clearDragItem, setDragItem } from '../../utils/dragData';

interface NoteItemProps {
  note: Note;
  indentLevel?: number;
}

export const NoteItem = React.memo(({ note, indentLevel = 0 }: NoteItemProps) => {
  const { currentNote, setCurrentNote, softDeleteNote } = useNotesStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isSelected = currentNote?._id === note._id;

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      await softDeleteNote(note._id);
    } catch {
      // fs error handled in store
    } finally {
      setPending(false);
    }
  }, [note._id, pending, softDeleteNote]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    setDragItem(e, { type: 'note', noteId: note._id });
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  }, [note._id]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    clearDragItem();
  }, []);

  const handleSelectNote = useCallback(() => {
    setCurrentNote(note);

    const isNotesRoute = location.pathname === '/' || location.pathname.startsWith('/tag/');
    if (!isNotesRoute) {
      navigate('/');
    }
  }, [location.pathname, navigate, note, setCurrentNote]);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleSelectNote}
      style={{ paddingLeft: indentLevel * 12 }}
      className={cn(
        'group relative flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
        isDragging && 'opacity-40'
      )}
    >
      <span className="text-sm truncate mr-2 flex-1 min-w-0">
        {note.title || 'Untitled'}
      </span>
      {note.tags && note.tags.length > 0 && (
        <div className="flex gap-1 flex-shrink-0">
          {note.tags.map((tag) => (
            <button
              key={tag}
              onClick={(e) => {
                e.stopPropagation();
                useNotesStore.getState().setSelectedTag(tag);
                useNotesStore.getState().openFoldersForTag(tag);
              }}
              className="inline-flex items-center px-1.5 py-0.5 bg-muted text-muted-foreground rounded-md text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={handleDelete}
        disabled={pending}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive disabled:opacity-30 transition-opacity shrink-0"
        title="Move to trash"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
});

NoteItem.displayName = 'NoteItem';
