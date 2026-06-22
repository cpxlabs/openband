const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

let mainWindow = null;

const PROJECTS_DIR = path.join(app.getPath('documents'), 'OpenBand', 'projects');

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'OpenBand',
    backgroundColor: '#0f0f11',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:8081');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  setupMenu();
}

function setupMenu() {
  const template = [
    {
      label: 'OpenBand',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-action', 'new-project'),
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-action', 'open-project'),
        },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-action', 'save-project'),
        },
        {
          label: 'Import...',
          click: () => mainWindow?.webContents.send('menu-action', 'import-project'),
        },
        {
          label: 'Export...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu-action', 'export-project'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About OpenBand',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About OpenBand',
              message: 'OpenBand v1.0.0',
              detail: 'Open-source music production platform.\nBuilt with Electron + React Native Web.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers

ipcMain.handle('show-open-dialog', async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title ?? 'Open',
    defaultPath: options.defaultPath,
    filters: options.filters ?? [{ name: 'All Files', extensions: ['*'] }],
    properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0] ?? null;
});

ipcMain.handle('show-save-dialog', async (_event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title ?? 'Save',
    defaultPath: options.defaultPath,
    filters: options.filters ?? [{ name: 'All Files', extensions: ['*'] }],
  });
  return result.canceled ? null : result.filePath ?? null;
});

const ALLOWED_DIRS = [app.getPath('documents'), app.getPath('userData'), PROJECTS_DIR];
function isPathAllowed(target: string): boolean {
  const resolved = path.resolve(target);
  return ALLOWED_DIRS.some(dir => resolved.startsWith(dir + path.sep) || resolved === dir);
}

ipcMain.handle('read-file', async (_event, filePath) => {
  if (!isPathAllowed(filePath)) throw new Error('Access denied');
  try {
    const buffer = await fs.promises.readFile(filePath);
    return buffer.buffer;
  } catch {
    return null;
  }
});

ipcMain.handle('write-file', async (_event, filePath, data) => {
  if (!isPathAllowed(filePath)) throw new Error('Access denied');
  await fs.promises.writeFile(filePath, Buffer.from(data));
});

ipcMain.handle('get-documents-path', () => {
  return app.getPath('documents');
});

ipcMain.handle('get-app-data-path', () => {
  return app.getPath('userData');
});

// Project CRUD

ipcMain.handle('list-projects', async () => {
  ensureProjectsDir();
  const entries = await fs.promises.readdir(PROJECTS_DIR, { withFileTypes: true });
  const projects = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.openband.json')) {
      const id = entry.name.replace('.openband.json', '');
      const stat = await fs.promises.stat(path.join(PROJECTS_DIR, entry.name));
      try {
        const content = await fs.promises.readFile(path.join(PROJECTS_DIR, entry.name), 'utf-8');
        const data = JSON.parse(content);
        projects.push({ id, name: data.title ?? id, lastModified: stat.mtimeMs });
      } catch {
        projects.push({ id, name: id, lastModified: stat.mtimeMs });
      }
    }
  }
  return projects.sort((a, b) => b.lastModified - a.lastModified);
});

function sanitizeProjectId(id: string): string {
  return path.basename(id).replace(/[^a-zA-Z0-9_-]/g, '');
}

ipcMain.handle('save-project', async (_event, id, data) => {
  ensureProjectsDir();
  const safeId = sanitizeProjectId(id);
  const filePath = path.join(PROJECTS_DIR, `${safeId}.openband.json`);
  await fs.promises.writeFile(filePath, data, 'utf-8');
});

ipcMain.handle('load-project', async (_event, id) => {
  const safeId = sanitizeProjectId(id);
  const filePath = path.join(PROJECTS_DIR, `${safeId}.openband.json`);
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
});

ipcMain.handle('delete-project', async (_event, id) => {
  const safeId = sanitizeProjectId(id);
  const filePath = path.join(PROJECTS_DIR, `${safeId}.openband.json`);
  try {
    await fs.promises.unlink(filePath);
  } catch {}
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
