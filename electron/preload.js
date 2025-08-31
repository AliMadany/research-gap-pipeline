const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getVersion: () => process.env.npm_package_version,
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  // Application events
  onAppReady: (callback) => ipcRenderer.on('app-ready', callback),
  onServiceStatus: (callback) => ipcRenderer.on('service-status', callback),
  
  // Utility functions
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Platform information
  platform: process.platform,
  isElectron: true
})

// Security: Remove Node.js APIs from the renderer process
delete window.require
delete window.exports
delete window.module