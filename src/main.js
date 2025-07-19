const { app, BrowserWindow, dialog, ipcMain, ipcRenderer} = require('electron');
const path = require('path');
const {connectToBoard, disconnectFromBoard} = require("./openbci/client");
const {setLogDirectory, logEntry, storeLogFile, setRatingForCondition} = require("./logger/logger");
const {findBestGroupFromFile} = require("./evaluation/evaluator");
const { SerialPort } = require('serialport');

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

ipcMain.on('set-condition-rating', (event, noiseType, volumeSetting, rating) => {
  console.log(`Storing rating: ${rating} for ${noiseType}.${volumeSetting}`);
  setRatingForCondition(noiseType, volumeSetting, rating);
});

ipcMain.on('connect-to-openbci-board', async (event, config) => {
  const win = BrowserWindow.getFocusedWindow();
  await connectToBoard(win, config);
});

ipcMain.handle('get-serial-ports', async () => {
  const ports = await SerialPort.list();
  return ports.map(port => port.path); // e.g., ['/dev/cu.usbserial-123', 'COM3']
});

ipcMain.on('set-log-directory', (event, dir) => {
  setLogDirectory(dir);
});

ipcMain.on('log-entry', (event, entry, noiseType, volumeSetting) => {
  logEntry(entry, noiseType, volumeSetting);
});

ipcMain.on('disable-logging', (event) => {
  const win = BrowserWindow.getFocusedWindow();
  win.webContents.send('logging-disabled');
});

ipcMain.on('save-log', () => {
  storeLogFile();
});

ipcMain.handle('get-adaptive-noise-config', async (_) => {
  const jsonPath = path.join(currentWorkingDir, 'noisescape-experiment.json');
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
    width: 1500,
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
