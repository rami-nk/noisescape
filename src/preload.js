// preload.js
const {contextBridge, ipcRenderer} = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'api', {
        // File system operations
        selectDirectory: () => ipcRenderer.invoke('select-directory'),
        // State management
        getStates: () => ipcRenderer.invoke('get-states'),
        setState: (state) => ipcRenderer.invoke('set-state', state),
        connectToOpenBciBoard: () => ipcRenderer.send('connect-to-openbci-board'),
        disconnectFromOpenBciBoard: () => ipcRenderer.send('disconnect-from-openbci-board'),
        onBciConnectionSuccess: (callback) => ipcRenderer.on('bci-connection-success', callback),
        onBciConnectionFailed: (callback) => ipcRenderer.on('bci-connection-failed', (_, msg) => callback(msg)),
        onBciDisconnected: (callback) => ipcRenderer.on('bci-disconnected', callback),
        onBciDisconnectionFailed: (callback) => ipcRenderer.on('bci-disconnection-failed', (_, msg) => callback(msg)),
        onBciConnectionPreparing: (callback) => ipcRenderer.on('bci-connection-prepare', (_, msg) => callback(msg)),
        onBciDisconnectionPreparing: (callback) => ipcRenderer.on('bci-disconnection-prepare', (_, msg) => callback(msg)),
        onBciLogMessage: (callback) => ipcRenderer.on('bci-log-message', (_, msg) => callback(msg)),
        onBandPowers: (callback) => ipcRenderer.on('band-powers', (event, data) => callback(data))
    }
);

window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
});
