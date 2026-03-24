import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  predictDigit: (base64) => ipcRenderer.invoke('predict-digit', base64),
  getFitnessHistory: () => ipcRenderer.invoke('get-fitness-history'),
  getModelMeta: () => ipcRenderer.invoke('get-model-meta')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}