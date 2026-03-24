import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

const getIconPath = (type = 'png') => {
  if (is.dev) {
    return path.join(process.cwd(), 'resources', `icon.${type}`)
  }

  return path.join(process.resourcesPath, `icon.${type}`)
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    title: 'EvoNet',
    icon: getIconPath('ico'),
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    nodeIntegration: false,
    contextIsolation: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      gpuAcceleration: true,
      hardwareAcceleration: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
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

// ── Predict digit ──────────────────────────────────────────────────────────────
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

// ── Load fitness history ───────────────────────────────────────────────────────
// Reads fitness_history.npy and returns the float values as a plain JS array.
// .npy format: 128-byte header (magic + version + header_len + header dict)
// followed by raw float32 little-endian values.
ipcMain.handle('get-fitness-history', async () => {
  try {
    const isDev = !app.isPackaged
    const npyPath = isDev
      ? path.join(__dirname, '../../src/model/fitness_history.npy')
      : path.join(process.resourcesPath, 'model', 'fitness_history.npy')

    const buf = fs.readFileSync(npyPath)

    // Parse npy header to find where data starts
    // Magic: \x93NUMPY (6 bytes), version (2 bytes), header_len (2 bytes LE)
    const headerLen = buf.readUInt16LE(8)
    const dataOffset = 10 + headerLen

    const count = (buf.length - dataOffset) / 4
    const values = []
    for (let i = 0; i < count; i++) {
      values.push(buf.readFloatLE(dataOffset + i * 4))
    }
    return values
  } catch (err) {
    console.error('Failed to load fitness history:', err)
    return []
  }
})

ipcMain.handle('get-model-meta', async () => {
  return {
    inputSize: 256,
    hiddenSize: 128,
    outputSize: 10,
    totalParams: 256 * 128 + 128 + 128 * 10 + 10,
    architecture: '256 → 128 → 10',
    activation: 'ReLU',
    optimizer: 'Genetic Algorithm',
    populationSize: 300,
    generations: 400,
    valAccuracy: 0.7492
  }
})
