const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld(
    'api', {
        // File system operations
        selectDirectory: () => ipcRenderer.invoke('select-directory'),
        // State management
        getStates: () => ipcRenderer.invoke('get-states'),
        setState: (state) => ipcRenderer.invoke('set-state', state),
        connectToOpenBciBoard: (config) => ipcRenderer.send('connect-to-openbci-board', config),
        disconnectFromOpenBciBoard: () => ipcRenderer.send('disconnect-from-openbci-board'),
        onBciConnectionSuccess: (callback) => ipcRenderer.on('bci-connection-success', callback),
        onBciConnectionFailed: (callback) => ipcRenderer.on('bci-connection-failed', (_, msg) => callback(msg)),
        onBciDisconnected: (callback) => ipcRenderer.on('bci-disconnected', callback),
        onBciDisconnectionFailed: (callback) => ipcRenderer.on('bci-disconnection-failed', (_, msg) => callback(msg)),
        onBciConnectionPreparing: (callback) => ipcRenderer.on('bci-connection-prepare', (_, msg) => callback(msg)),
        onBciDisconnectionPreparing: (callback) => ipcRenderer.on('bci-disconnection-prepare', (_, msg) => callback(msg)),
        onBciLogMessage: (callback) => ipcRenderer.on('bci-log-message', (_, msg) => callback(msg)),
        onBandPowers: (callback) => ipcRenderer.on('band-powers', (event, data) => callback(data)),
        setLogDirectory: (dir) => ipcRenderer.send('set-log-directory', dir),
        logEntry: (entry, noiseType, volumeSetting) => ipcRenderer.send('log-entry', entry, noiseType, volumeSetting),
        getAdaptiveNoiseConfig: () => ipcRenderer.invoke('get-adaptive-noise-config'),
        getCurrentDirectory: () => ipcRenderer.invoke('get-current-directory'),
        sendConditionRating: (noiseType, volumeSetting, rating) => ipcRenderer.send('set-condition-rating', noiseType, volumeSetting, rating),
        onDisableLogging: (callback) => ipcRenderer.on('logging-disabled', callback),
        notifyLoggingStopped: () => ipcRenderer.send('disable-logging'),
        getSerialPorts: () => ipcRenderer.invoke('get-serial-ports'),
        saveLog: () => ipcRenderer.send('save-log'),

    }
);

window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
});
