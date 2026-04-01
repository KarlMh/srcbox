import { app, BrowserWindow, Menu, dialog, shell, ipcMain } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import * as fs from 'fs/promises';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac
      ? { trafficLightPosition: { x: 15, y: 15 } }
      : {
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: '#6b7280',
            height: 40,
          },
        }),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

// ── Path helpers ──────────────────────────────────────────────────────────────

function toSlash(p: string): string {
  return p.split(path.sep).join('/');
}

function resolveBoxPath(rootPath: string, boxPath: string | null): string {
  if (!boxPath) return rootPath;
  return path.join(rootPath, ...boxPath.split('/'));
}

// ── Note file format: YAML front-matter + markdown body ───────────────────────
// Supports legacy JSON format for backward compat.

function parseNoteFile(rawContent: string, relDir: string): object | null {
  try {
    // Front-matter format: ---\nkey: value\n---\n\nbody
    const fmMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (fmMatch) {
      const meta: Record<string, unknown> = {};
      for (const line of fmMatch[1].split(/\r?\n/)) {
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        const raw = line.slice(idx + 1).trim();
        if (raw === 'null' || raw === '') meta[key] = null;
        else if (key === 'tags') meta[key] = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
        else meta[key] = raw;
      }
      return { ...meta, content: fmMatch[2].trimStart(), boxPath: relDir || null };
    }

    // Legacy JSON format
    const note = JSON.parse(rawContent);
    // Migrate folderPath → boxPath
    if ('folderPath' in note && !('boxPath' in note)) note.boxPath = note.folderPath;
    note.boxPath = relDir || null;
    return note;
  } catch {
    return null;
  }
}

// ── Recursive helpers ─────────────────────────────────────────────────────────

async function readNotesRecursive(rootPath: string, relDir = ''): Promise<object[]> {
  const fullPath = relDir ? path.join(rootPath, ...relDir.split('/')) : rootPath;
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(fullPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const notes: object[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const childRelDir = relDir ? `${relDir}/${entry.name}` : entry.name;
      notes.push(...(await readNotesRecursive(rootPath, childRelDir)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const raw = await fs.readFile(path.join(fullPath, entry.name), 'utf-8');
        const note = parseNoteFile(raw, relDir);
        if (note) notes.push(note);
      } catch (err) {
        console.error(`Error reading ${entry.name}:`, err);
      }
    }
  }
  return notes;
}

async function readBoxesRecursive(rootPath: string, relDir = ''): Promise<object[]> {
  const fullPath = relDir ? path.join(rootPath, ...relDir.split('/')) : rootPath;
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(fullPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const boxes: object[] = [];
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
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select folder for srcbox',
    defaultPath: app.getPath('documents'),
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };

  const chosen = result.filePaths[0];
  const srcboxPath = path.join(chosen, 'srcbox');
  try {
    await fs.mkdir(srcboxPath, { recursive: true });
    return { success: true, path: toSlash(srcboxPath) };
  } catch {
    return { success: true, path: toSlash(chosen) };
  }
});

ipcMain.handle('check-folder-access', async (_e, folderPath: string) => {
  try {
    await fs.access(folderPath, fs.constants.R_OK | fs.constants.W_OK);
    return { accessible: true };
  } catch {
    return { accessible: false };
  }
});

ipcMain.handle('read-notes', async (_e, rootPath: string) => {
  try {
    return { success: true, notes: await readNotesRecursive(rootPath) };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// content = full serialized file (front-matter + body) produced by renderer
ipcMain.handle('write-note', async (_e, rootPath: string, noteId: string, boxPath: string | null, content: string) => {
  try {
    const dir = resolveBoxPath(rootPath, boxPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${noteId}.md`), content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('delete-note', async (_e, rootPath: string, noteId: string, boxPath: string | null) => {
  try {
    const dir = resolveBoxPath(rootPath, boxPath);
    await fs.unlink(path.join(dir, `${noteId}.md`));
    return { success: true };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { success: true };
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('rename-note-file', async (_e, rootPath: string, oldFilename: string, newFilename: string, boxPath: string | null) => {
  try {
    const dir = resolveBoxPath(rootPath, boxPath);
    await fs.rename(path.join(dir, oldFilename), path.join(dir, newFilename));
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('move-note', async (_e, rootPath: string, noteId: string, fromBoxPath: string | null, toBoxPath: string | null) => {
  try {
    const fromDir = resolveBoxPath(rootPath, fromBoxPath);
    const toDir = resolveBoxPath(rootPath, toBoxPath);
    await fs.mkdir(toDir, { recursive: true });
    await fs.rename(path.join(fromDir, `${noteId}.md`), path.join(toDir, `${noteId}.md`));
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('read-folders', async (_e, rootPath: string) => {
  try {
    return { success: true, folders: await readBoxesRecursive(rootPath) };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('create-folder', async (_e, rootPath: string, parentPath: string | null, name: string) => {
  try {
    const relPath = parentPath ? `${parentPath}/${name}` : name;
    await fs.mkdir(resolveBoxPath(rootPath, relPath), { recursive: true });
    return { success: true, folder: { id: relPath, name, path: relPath, parentPath: parentPath || null } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('rename-folder', async (_e, rootPath: string, folderPath: string, newName: string) => {
  try {
    const segs = folderPath.split('/');
    segs[segs.length - 1] = newName;
    const newRelPath = segs.join('/');
    await fs.rename(resolveBoxPath(rootPath, folderPath), resolveBoxPath(rootPath, newRelPath));
    return { success: true, newPath: newRelPath };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('move-folder', async (_e, rootPath: string, folderPath: string, targetParentPath: string | null) => {
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
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('delete-folder', async (_e, rootPath: string, folderPath: string) => {
  try {
    await fs.rmdir(resolveBoxPath(rootPath, folderPath));
    return { success: true };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOTEMPTY') return { success: false, error: 'Box is not empty' };
    return { success: false, error: (err as Error).message };
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
