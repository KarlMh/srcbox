import { FolderOpen } from 'lucide-react';

interface FolderSelectionModalProps {
  isOpen: boolean;
  onSelectFolder: () => void;
  onCancel: () => void;
}

export function FolderSelectionModal({ isOpen, onSelectFolder, onCancel }: FolderSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Select a Folder</h2>
          <p className="text-muted-foreground mb-6">
            To save your notes, please select a folder where they will be stored. 
            Your notes will be saved as individual markdown files.
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSelectFolder}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Select Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}