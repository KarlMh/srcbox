import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';
import { TrashPage } from './pages/TrashPage';
import { FolderSelectionModal } from './components/modals/FolderSelectionModal';
import { useNotesStore } from './stores/notesStore';
import { useUIStore } from './stores/uiStore';

function App() {
  const notesStore = useNotesStore();
  const { loadNotes, loadBoxes, isFileSystemInitialized, autoReconnectDone, showFolderSelection } = notesStore;
  const { theme } = useUIStore();

  useEffect(() => {
    notesStore.autoReconnect();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (isFileSystemInitialized) {
      loadNotes();
      loadBoxes();
    }
  }, [loadNotes, loadBoxes, isFileSystemInitialized]);

  useEffect(() => {
    if (autoReconnectDone && !isFileSystemInitialized && !useNotesStore.getState().showFolderSelectionModal) {
      showFolderSelection();
    }
  }, [autoReconnectDone, isFileSystemInitialized, showFolderSelection]);

  const { showFolderSelectionModal, hideFolderSelection, handleFolderSelected } = notesStore;

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<NotesPage />} />
          <Route path="/tag/:tag" element={<NotesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <FolderSelectionModal
        isOpen={showFolderSelectionModal}
        onSelectFolder={handleFolderSelected}
        onCancel={hideFolderSelection}
      />
    </BrowserRouter>
  );
}

export default App;
