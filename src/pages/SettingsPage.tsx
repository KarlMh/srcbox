import { useState, useEffect } from 'react';
import { ArrowLeft, Moon, Sun, Database, Download, Upload, Trash2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { useNotesStore } from '../stores/notesStore';
import { useUIStore } from '../stores/uiStore';
import { notesDb } from '../db/database';
import { fileSystemStorage } from '../services/fileSystemService';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import { cn } from '../utils/cn';

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useUIStore();
  const [noteCount, setNoteCount] = useState<number>(0);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadNoteCount();
  }, []);

  const loadNoteCount = async () => {
    try {
      const notes = await notesDb.getAllNotes();
      setNoteCount(notes.length);
    } catch (error) {
      console.error('Error loading note count:', error);
    }
  };

  const handleExport = async () => {
    try {
      const notes = await notesDb.getAllNotes();
      const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `srcbox-notes-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting notes:', error);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImportFeedback(null);
      try {
        const text = await file.text();
        const notes = JSON.parse(text);
        for (const note of notes) {
          await notesDb.createNote({
            title: note.title,
            content: note.content,
            tags: note.tags || [],
          });
        }
        setImportFeedback({ type: 'success', message: `Imported ${notes.length} note${notes.length !== 1 ? 's' : ''}.` });
        loadNoteCount();
      } catch (error) {
        console.error('Error importing notes:', error);
        setImportFeedback({ type: 'error', message: 'Import failed. Make sure the file is a valid srcbox export.' });
      }
    };
    input.click();
  };

  const handleClearAll = async () => {
    try {
      const notes = await notesDb.getAllNotes();
      for (const note of notes) {
        await notesDb.deleteNote(note._id);
      }
      loadNoteCount();
    } catch (error) {
      console.error('Error clearing notes:', error);
    }
    setConfirmDeleteAllOpen(false);
  };

  const notesFolder = fileSystemStorage.state.rootPath;

  return (
    <div className="flex h-full min-h-0 flex-col pt-12 md:pt-0">
      <PageHeader
        title="Settings"
        subtitle="Manage appearance and data"
        leftSlot={
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-2xl space-y-8">

          {/* Appearance */}
          <section>
            <h2 className="text-lg font-medium mb-4">Appearance</h2>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span>Theme</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm transition-colors',
                    theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                  )}
                >
                  Light
                </button>
                <button
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm transition-colors',
                    theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                  )}
                >
                  Dark
                </button>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h2 className="text-lg font-medium mb-4">Data</h2>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Database className="h-5 w-5" />
                  <span className="font-medium">Local Storage</span>
                </div>
                <div className="text-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Notes</span>
                    <span>{noteCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Folder</span>
                    <span className="text-xs truncate text-right">{notesFolder || 'Not set'}</span>
                  </div>
                  <button
                    onClick={() => useNotesStore.getState().showFolderSelection()}
                    className="w-full mt-1 px-3 py-1.5 text-xs bg-background border border-border rounded hover:bg-muted transition-colors"
                  >
                    Change Folder
                  </button>
                </div>
              </div>

              <button
                onClick={handleExport}
                className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <Download className="h-5 w-5" />
                <span>Export Notes</span>
              </button>

              <div>
                <button
                  onClick={handleImport}
                  className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <Upload className="h-5 w-5" />
                  <span>Import Notes</span>
                </button>
                {importFeedback && (
                  <p className={cn(
                    'mt-1.5 px-3 text-sm',
                    importFeedback.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                  )}>
                    {importFeedback.message}
                  </p>
                )}
              </div>

              <button
                onClick={() => setConfirmDeleteAllOpen(true)}
                className="w-full flex items-center gap-3 p-3 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="h-5 w-5" />
                <span>Delete All Notes</span>
              </button>
            </div>
          </section>

          {/* Sync */}
          <section>
            <h2 className="text-lg font-medium mb-4">Sync</h2>
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <p className="text-sm text-muted-foreground">
                Your notes are plain markdown files stored in the folder above. Use{' '}
                <a
                  href="https://syncthing.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Syncthing
                </a>{' '}
                to sync that folder between devices — free, open source, and peer-to-peer with no cloud required.
              </p>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Desktop setup (Linux / Mac / Windows)</h3>
                </div>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside ml-1">
                  <li>
                    Download and install Syncthing from{' '}
                    <a
                      href="https://syncthing.net/downloads/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 hover:no-underline"
                    >
                      syncthing.net/downloads
                    </a>
                  </li>
                  <li>Open the Syncthing web UI and click <strong className="text-foreground">Add Folder</strong></li>
                  <li>
                    Set the folder path to your notes folder
                    {notesFolder && (
                      <span className="block mt-0.5 ml-4 font-mono text-xs bg-background px-2 py-1 rounded border border-border">
                        {notesFolder}
                      </span>
                    )}
                  </li>
                  <li>Add your second device in Syncthing and share the folder with it</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Android</h3>
                </div>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside ml-1">
                  <li>
                    Install{' '}
                    <a
                      href="https://f-droid.org/packages/com.nutomic.syncthingandroid/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 hover:no-underline"
                    >
                      Syncthing
                    </a>{' '}
                    from F-Droid or the Play Store
                  </li>
                  <li>Accept the folder share from your desktop</li>
                  <li>Use any markdown editor on Android to read and edit notes from the synced folder</li>
                </ol>
              </div>
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-lg font-medium mb-4">About</h2>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-1">srcbox</h3>
              <p className="text-sm text-muted-foreground mb-2">
                A minimal, local-first markdown notes app. Notes are stored as plain markdown files on your filesystem.
              </p>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
            </div>
          </section>

        </div>
      </div>

      {confirmDeleteAllOpen && (
        <ConfirmDialog
          title="Delete all notes?"
          message="This will permanently delete all notes. This cannot be undone."
          confirmLabel="Delete All"
          onConfirm={() => handleClearAll()}
          onCancel={() => setConfirmDeleteAllOpen(false)}
        />
      )}
    </div>
  );
}
