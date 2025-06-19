const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const {connectToBoard, disconnectFromBoard} = require("./openbci/client");

// Store the current working directory and state
let currentWorkingDir = app.getPath('documents');
let currentState = 'Relaxed';

// Register IPC handlers BEFORE app.whenReady()
// Handle directory selection
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    currentWorkingDir = result.filePaths[0];
    return currentWorkingDir;
  }
  return null;
});

// Handle state management
ipcMain.handle('get-states', () => {
  return ['Relaxed']; // For now, only return 'Relaxed' as the available state
});

ipcMain.handle('set-state', (event, state) => {
  if (state === 'Relaxed') {
    currentState = state;
    return true;
  }
  return false;
});

ipcMain.on('connect-to-openbci-board', async () => {
  const win = BrowserWindow.getFocusedWindow();
  await connectToBoard(win);
});

ipcMain.on('disconnect-from-openbci-board', async () => {
  await disconnectFromBoard();
});

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join('static', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
