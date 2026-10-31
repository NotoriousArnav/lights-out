const { app, BrowserWindow, Menu, session, shell } = require('electron')

const PRODUCTION_URL = 'https://lights-out-puzzle-game.vercel.app'
const REQUESTED_URL = process.env.LIGHTS_OUT_URL || PRODUCTION_URL

function appUrl() {
  try {
    const url = new URL(REQUESTED_URL)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url
  } catch {
    // Fall through to the production URL.
  }
  return new URL(PRODUCTION_URL)
}

const target = appUrl()
const targetOrigin = target.origin

function isWebUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function openExternal(value) {
  if (isWebUrl(value)) void shell.openExternal(value)
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 360,
    minHeight: 640,
    backgroundColor: '#f4f1ea',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    try {
      if (new URL(url).origin === targetOrigin) return
    } catch {
      // Block malformed URLs below.
    }
    event.preventDefault()
    openExternal(url)
  })

  win.webContents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    if (errorCode === -3) return
    console.error(`Failed to load ${target.href}: ${errorDescription}`)
  })

  void win.loadURL(target.href)
}

app.setAppUserModelId('app.lightsout.desktop')

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.whenReady().then(() => {
    if (process.platform !== 'darwin') {
      Menu.setApplicationMenu(null)
    }

    session.defaultSession.setPermissionRequestHandler(
      (_webContents, _permission, callback) => callback(false),
    )
    session.defaultSession.setPermissionCheckHandler(() => false)

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
