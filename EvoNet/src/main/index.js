import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn } from 'child_process'
import path from 'path'

function createWindow() {
  const mainWindow = new BrowserWindow({
    title: 'EvoNet',
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}


app.whenReady().then(() => {

  electronApp.setAppUserModelId('com.evonet.app')


  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})



// Prediction Model Functions

ipcMain.handle('predict-digit', async (_, base64Image) => {
  return new Promise((resolve, reject) => {
    try {
      const isDev = !app.isPackaged

      const exePath = isDev
        ? path.join(__dirname, '../../resources/model/predict.exe')
        : path.join(process.resourcesPath, 'model', 'predict.exe')

      const py = spawn(exePath, [base64Image])

      let data = ''
      let error = ''

      py.stdout.on('data', (chunk) => {
        data += chunk.toString()
      })

      py.stderr.on('data', (err) => {
        error += err.toString()
      })

      py.on('close', (code) => {
        if (code !== 0) {
          console.error('stderr:', error)
          return reject(`Process exited with code ${code}: ${error}`)
        }
      
        try {
          const result = JSON.parse(data.replace(/'/g, '"'))
          resolve(result)
        } catch (e) {
          reject('Invalid Python output: ' + data)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
})
