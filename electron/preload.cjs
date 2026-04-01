const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  onMenuNewNote: (callback) => {
    ipcRenderer.on('menu-new-note', callback);
  },
  onMenuExport: (callback) => {
    ipcRenderer.on('menu-export', (_event, filePath) => callback(filePath));
  },
  onMenuImport: (callback) => {
    ipcRenderer.on('menu-import', (_event, filePath) => callback(filePath));
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  // File system operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readNotes: (rootPath) => ipcRenderer.invoke('read-notes', rootPath),
  writeNote: (rootPath, noteId, folderPath, content) =>
    ipcRenderer.invoke('write-note', rootPath, noteId, folderPath || null, content),
  deleteNote: (rootPath, noteId, folderPath) =>
    ipcRenderer.invoke('delete-note', rootPath, noteId, folderPath || null),
  moveNote: (rootPath, noteId, fromFolderPath, toFolderPath) =>
    ipcRenderer.invoke('move-note', rootPath, noteId, fromFolderPath || null, toFolderPath || null),
  renameNoteFile: (rootPath, oldFilename, newFilename, folderPath) =>
    ipcRenderer.invoke('rename-note-file', rootPath, oldFilename, newFilename, folderPath || null),
  readFolders: (rootPath) => ipcRenderer.invoke('read-folders', rootPath),
  createFolder: (rootPath, parentPath, name) =>
    ipcRenderer.invoke('create-folder', rootPath, parentPath || null, name),
  renameFolder: (rootPath, folderPath, newName) =>
    ipcRenderer.invoke('rename-folder', rootPath, folderPath, newName),
  moveFolder: (rootPath, folderPath, targetParentPath) =>
    ipcRenderer.invoke('move-folder', rootPath, folderPath, targetParentPath || null),
  deleteFolder: (rootPath, folderPath) =>
    ipcRenderer.invoke('delete-folder', rootPath, folderPath),
  checkFolderAccess: (path) => ipcRenderer.invoke('check-folder-access', path),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
});
