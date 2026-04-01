import { useEffect, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { useNotesStore } from '../stores/notesStore';
import { shouldSkipDeleteConfirm, setSkipDeleteConfirm } from '../utils/deletePrefs';
import { TrashNoteItem } from '../components/trash/TrashNoteItem';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import { Note } from '../types/note';

export function TrashPage() {
  const navigate = useNavigate();
  const { trashedNotes, loadTrashedNotes, permanentDeleteNote } = useNotesStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isDeleteAll, setIsDeleteAll] = useState(false);

  useEffect(() => {
    loadTrashedNotes();
  }, [loadTrashedNotes]);

  const requestDelete = (id: string) => {
    if (shouldSkipDeleteConfirm()) {
      permanentDeleteNote(id);
      return;
    }
    setPendingId(id);
    setIsDeleteAll(false);
    setConfirmOpen(true);
  };

  const requestDeleteAll = () => {
    setIsDeleteAll(true);
    setPendingId(null);
    setConfirmOpen(true);
  };

  const handleConfirm = (dontAskAgain: boolean) => {
    if (dontAskAgain) setSkipDeleteConfirm(true);
    if (isDeleteAll) {
      const toDelete = [...trashedNotes];
      for (const note of toDelete) permanentDeleteNote(note._id);
    } else if (pendingId) {
      permanentDeleteNote(pendingId);
    }
    setConfirmOpen(false);
    setPendingId(null);
    setIsDeleteAll(false);
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setPendingId(null);
    setIsDeleteAll(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col pt-12 md:pt-0">
      <PageHeader
        title="Trash"
        subtitle="Restore deleted notes or remove permanently"
        leftSlot={
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
        actions={
          trashedNotes.length > 0 ? (
            <button
              onClick={requestDeleteAll}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete All
            </button>
          ) : null
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {trashedNotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Trash is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trashedNotes.map((note: Note) => (
              <TrashNoteItem
                key={note._id}
                note={note}
                indentLevel={note.boxPath ? 1 : 0}
                onRequestDelete={() => requestDelete(note._id)}
              />
            ))}
          </div>
        )}
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title={isDeleteAll ? 'Delete all notes?' : 'Delete permanently?'}
          message={
            isDeleteAll
              ? `This will permanently delete all ${trashedNotes.length} notes in trash. This cannot be undone.`
              : 'This note will be permanently deleted. This cannot be undone.'
          }
          confirmLabel={isDeleteAll ? 'Delete All' : 'Delete'}
          showDontAsk={!isDeleteAll}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
