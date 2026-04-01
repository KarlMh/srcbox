const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow = null;

function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac ? { trafficLightPosition: { x: 15, y: 15 } } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ── Path helpers ──────────────────────────────────────────────────────────────

function toSlash(p) {
  return p.split(path.sep).join('/');
}

function resolveBoxPath(rootPath, boxPath) {
  if (!boxPath) return rootPath;
  return path.join(rootPath, ...boxPath.split('/'));
}

// ── Note file format: YAML front-matter + markdown body ───────────────────────
// Supports legacy JSON format and plain markdown for backward compat.

function parseNoteFile(rawContent, relDir, filename) {
  try {
    // Front-matter format: ---\nkey: value\n---\n\nbody
    const fmMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (fmMatch) {
      const meta = {};
      for (const line of fmMatch[1].split(/\r?\n/)) {
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        const raw = line.slice(idx + 1).trim();
        if (key === 'tags') meta[key] = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
        else if (raw === 'null' || raw === '') meta[key] = null;
        else meta[key] = raw;
      }
      return { ...meta, content: fmMatch[2].trimStart(), boxPath: relDir || null };
    }

    // Legacy JSON format
    try {
      const note = JSON.parse(rawContent);
      if ('folderPath' in note && !('boxPath' in note)) note.boxPath = note.folderPath;
      note.boxPath = relDir || null;
      if (!note.slug) note.slug = filename || 'untitled';
      if (!note._id) note._id = note.slug;
      return note;
    } catch {
      // fall through to plain markdown fallback
    }

    // Plain markdown fallback — treat filename as the id/title
    const slug = filename || 'untitled';
    const now = new Date().toISOString();
    return {
      _id: slug,
      slug: slug,
      title: slug.replace(/-/g, ' '),
      content: rawContent,
      tags: [],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      type: 'note',
      boxPath: relDir || null,
    };
  } catch {
    return null;
  }
}

// ── Recursive helpers ─────────────────────────────────────────────────────────

async function readNotesRecursive(rootPath, relDir = '') {
  const fullPath = relDir ? path.join(rootPath, ...relDir.split('/')) : rootPath;
  let entries;
  try {
    entries = await fs.readdir(fullPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const notes = [];
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const childRelDir = relDir ? `${relDir}/${entry.name}` : entry.name;
      notes.push(...(await readNotesRecursive(rootPath, childRelDir)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const raw = await fs.readFile(path.join(fullPath, entry.name), 'utf-8');
        const slug = entry.name.slice(0, -3);
        const note = parseNoteFile(raw, relDir, slug);
        if (note) notes.push(note);
      } catch (err) {
        console.error(`Error reading ${entry.name}:`, err);
      }
    }
  }
  return notes;
}

async function readBoxesRecursive(rootPath, relDir = '') {
  const fullPath = relDir ? path.join(rootPath, ...relDir.split('/')) : rootPath;
  let entries;
  try {
    entries = await fs.readdir(fullPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const boxes = [];
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const boxRelPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      boxes.push({ id: boxRelPath, name: entry.name, path: boxRelPath, parentPath: relDir || null });
      boxes.push(...(await readBoxesRecursive(rootPath, boxRelPath)));
    }
  }
  return boxes;
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select folder for srcbox',
    defaultPath: app.getPath('documents'),
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  const chosen = result.filePaths[0];
  const srcboxPath = path.join(chosen, 'srcbox');
  try {
    await fs.mkdir(srcboxPath, { recursive: true });
    return { success: true, path: toSlash(srcboxPath) };
  } catch {
    return { success: true, path: toSlash(chosen) };
  }
});

ipcMain.handle('window-minimize', () => mainWindow?.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window-close', () => mainWindow?.close());

ipcMain.handle('check-folder-access', async (_event, rootPath) => {
  try {
    await fs.access(rootPath, fs.constants.R_OK | fs.constants.W_OK);
    return { accessible: true };
  } catch {
    return { accessible: false };
  }
});

ipcMain.handle('read-notes', async (_event, rootPath) => {
  try {
    return { success: true, notes: await readNotesRecursive(rootPath) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-note', async (_event, rootPath, noteId, boxPath, content) => {
  try {
    const dir = resolveBoxPath(rootPath, boxPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${noteId}.md`), content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-note', async (_event, rootPath, noteId, boxPath) => {
  try {
    const dir = resolveBoxPath(rootPath, boxPath);
    await fs.unlink(path.join(dir, `${noteId}.md`));
    return { success: true };
  } catch (error) {
    if (error.code === 'ENOENT') return { success: true };
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-note-file', async (_event, rootPath, oldFilename, newFilename, boxPath) => {
  try {
    const dir = resolveBoxPath(rootPath, boxPath);
    await fs.rename(path.join(dir, oldFilename), path.join(dir, newFilename));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('move-note', async (_event, rootPath, noteId, fromBoxPath, toBoxPath) => {
  try {
    const fromDir = resolveBoxPath(rootPath, fromBoxPath);
    const toDir = resolveBoxPath(rootPath, toBoxPath);
    await fs.mkdir(toDir, { recursive: true });
    await fs.rename(path.join(fromDir, `${noteId}.md`), path.join(toDir, `${noteId}.md`));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-folders', async (_event, rootPath) => {
  try {
    return { success: true, folders: await readBoxesRecursive(rootPath) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-folder', async (_event, rootPath, parentPath, name) => {
  try {
    const relPath = parentPath ? `${parentPath}/${name}` : name;
    await fs.mkdir(resolveBoxPath(rootPath, relPath), { recursive: true });
    return { success: true, folder: { id: relPath, name, path: relPath, parentPath: parentPath || null } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-folder', async (_event, rootPath, folderPath, newName) => {
  try {
    const segs = folderPath.split('/');
    segs[segs.length - 1] = newName;
    const newRelPath = segs.join('/');
    await fs.rename(resolveBoxPath(rootPath, folderPath), resolveBoxPath(rootPath, newRelPath));
    return { success: true, newPath: newRelPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('move-folder', async (_event, rootPath, folderPath, targetParentPath) => {
  try {
    const sourcePath = resolveBoxPath(rootPath, folderPath);
    const sourceSegs = folderPath.split('/').filter(Boolean);
    const boxName = sourceSegs[sourceSegs.length - 1];
    if (!boxName) return { success: false, error: 'Invalid box path' };

    const normalizedTargetParent = targetParentPath && targetParentPath.trim().length > 0
      ? targetParentPath
      : null;

    if (normalizedTargetParent === folderPath || (normalizedTargetParent && normalizedTargetParent.startsWith(folderPath + '/'))) {
      return { success: false, error: 'Cannot move a box into itself' };
    }

    const destinationRelativePath = normalizedTargetParent ? `${normalizedTargetParent}/${boxName}` : boxName;
    if (destinationRelativePath === folderPath) {
      return { success: true, newPath: folderPath };
    }

    const destinationParentAbs = resolveBoxPath(rootPath, normalizedTargetParent);
    const destinationAbs = resolveBoxPath(rootPath, destinationRelativePath);

    await fs.mkdir(destinationParentAbs, { recursive: true });

    try {
      await fs.access(destinationAbs);
      return { success: false, error: 'A box with the same name already exists in target location' };
    } catch {
      // destination does not exist, continue
    }

    await fs.rename(sourcePath, destinationAbs);
    return { success: true, newPath: destinationRelativePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-folder', async (_event, rootPath, folderPath) => {
  try {
    await fs.rmdir(resolveBoxPath(rootPath, folderPath));
    return { success: true };
  } catch (error) {
    if (error.code === 'ENOTEMPTY') return { success: false, error: 'Box is not empty' };
    return { success: false, error: error.message };
  }
});

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
