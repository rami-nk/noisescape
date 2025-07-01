const { app, BrowserWindow, dialog, ipcMain, ipcRenderer} = require('electron');
const path = require('path');
const {connectToBoard, disconnectFromBoard} = require("./openbci/client");
const {setLogDirectory, logEntry, storeLogFile} = require("./logger/logger");
const {findHighestAlphaGroupFromFile} = require("./evaluation/evaluator");

// Store the current working directory and state
let currentWorkingDir = process.cwd();
setLogDirectory(currentWorkingDir);
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

ipcMain.on('set-log-directory', (event, dir) => {
  setLogDirectory(dir);
});

ipcMain.on('log-entry', (event, entry, noiseType, volumeSetting) => {
  logEntry(entry, noiseType, volumeSetting);
});

ipcMain.on('save-log', () => {
  storeLogFile();
});

ipcMain.handle('get-adaptive-noise-config', async () => {
  // assume your data file lives in the currentWorkingDir:
  const jsonPath = path.join(currentWorkingDir, 'data.json');
  try {
    return findHighestAlphaGroupFromFile(jsonPath);
  } catch (err) {
    console.error('Adaptive noise config error:', err);
    return null;
  }
});

ipcMain.on('disconnect-from-openbci-board', async () => {
  const win = BrowserWindow.getFocusedWindow();
  await disconnectFromBoard(win);
});

ipcMain.handle('get-current-directory', () => {
  return currentWorkingDir;
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
