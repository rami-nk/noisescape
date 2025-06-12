// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // File system operations
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    // State management
    getStates: () => ipcRenderer.invoke('get-states'),
    setState: (state) => ipcRenderer.invoke('set-state', state)
  }
);

window.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded and parsed");
});
