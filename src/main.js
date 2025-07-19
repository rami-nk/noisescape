const { app, BrowserWindow, dialog, ipcMain, ipcRenderer} = require('electron');
const path = require('path');
const {connectToBoard, disconnectFromBoard} = require("./openbci/client");
const {setLogDirectory, logEntry, storeLogFile} = require("./logger/logger");
const {findBestGroupFromFile} = require("./evaluation/evaluator");

const states = ['Relaxed', 'Focused', "Alert", "Meditative"];

let currentWorkingDir = process.cwd();
setLogDirectory(currentWorkingDir);
let currentState = 'Relaxed';

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

ipcMain.handle('get-states', () => {
  return states;
});

ipcMain.handle('set-state', (event, state) => {
    currentState = state;
    return true;
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

ipcMain.handle('get-adaptive-noise-config', async (_) => {
  const jsonPath = path.join(currentWorkingDir, 'data.json');
  try {
    return findBestGroupFromFile(jsonPath, currentState);
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
    width: 1300,
    height: 950,
    icon: path.join(__dirname, '..', 'static', 'assets', 'logo.png'),
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
