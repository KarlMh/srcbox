import { Editor } from '../components/editor/Editor';
import { PageHeader } from '../components/layout/PageHeader';
import { useNotesStore } from '../stores/notesStore';
import { FileText, Plus } from 'lucide-react';

export function NotesPage() {
  const {
    currentNote,
    createNote,
    showFolderSelection,
    selectedTag,
  } = useNotesStore();

  const handleCreateNote = async () => {
    const { isFileSystemInitialized } = useNotesStore.getState();
    if (!isFileSystemInitialized) {
      showFolderSelection();
      return;
    }
    await createNote();
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden pt-12 md:pt-0">
      {currentNote ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Editor />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PageHeader
            title={selectedTag ? `#${selectedTag}` : 'Notes'}
            subtitle={selectedTag ? 'Tagged notes' : 'Select or create a note to get started'}
          />

          <div className="flex flex-1 items-center justify-center p-5 sm:p-8">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">No note selected</h2>
              <p className="mb-6 text-muted-foreground">
                Select a note from the sidebar or create a new one
              </p>
              <button
                onClick={handleCreateNote}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Create Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
