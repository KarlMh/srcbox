import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Folder selection
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Note operations (folderPath = relative path from root, null = root)
  readNotes: (rootPath: string) => ipcRenderer.invoke('read-notes', rootPath),
  writeNote: (rootPath: string, noteId: string, folderPath: string | null, content: string) =>
    ipcRenderer.invoke('write-note', rootPath, noteId, folderPath, content),
  deleteNote: (rootPath: string, noteId: string, folderPath: string | null) =>
    ipcRenderer.invoke('delete-note', rootPath, noteId, folderPath),
  moveNote: (rootPath: string, noteId: string, fromFolderPath: string | null, toFolderPath: string | null) =>
    ipcRenderer.invoke('move-note', rootPath, noteId, fromFolderPath, toFolderPath),

  // Folder operations
  readFolders: (rootPath: string) => ipcRenderer.invoke('read-folders', rootPath),
  createFolder: (rootPath: string, parentPath: string | null, name: string) =>
    ipcRenderer.invoke('create-folder', rootPath, parentPath, name),
  renameFolder: (rootPath: string, folderPath: string, newName: string) =>
    ipcRenderer.invoke('rename-folder', rootPath, folderPath, newName),
  moveFolder: (rootPath: string, folderPath: string, targetParentPath: string | null) =>
    ipcRenderer.invoke('move-folder', rootPath, folderPath, targetParentPath),
  deleteFolder: (rootPath: string, folderPath: string) =>
    ipcRenderer.invoke('delete-folder', rootPath, folderPath),

  // Access check
  checkFolderAccess: (path: string) => ipcRenderer.invoke('check-folder-access', path),

  // Menu events (kept for future use)
  onMenuNewNote: (callback: () => void) => ipcRenderer.on('menu-new-note', callback),
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
  renameNoteFile: (rootPath: string, oldFilename: string, newFilename: string, folderPath: string | null) => 
    ipcRenderer.invoke('rename-note-file', rootPath, oldFilename, newFilename, folderPath),
});
