const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  Tray,
  remote,
  session,
} = require("electron")
const ElectronPreferences = require("electron-preferences")
const { exit } = require("process")
const storage = require("electron-json-storage")
const path = require("path")

class Utils {
  loadURL() {
    serverURL = preferences.value("server.name")
    if (serverURL != null && serverURL != "") {
      win.loadURL(serverURL + "/apps/spreed/#/")
    }
  }
}

const utils = new Utils()

let tray = null
let win = null
let serverURL = null
let preferencesWindow = null

const setServerURL = () => {}

const preferences = new ElectronPreferences({
  browserWindowOpts: {
    modal: true,
  },

  dataStore: app.getPath("userData") + "/preferences.json",

  defaults: {
    server: {
      name: "",
    },
  },

  sections: [
    {
      id: "server",
      label: "Server settings",
      icon: "world",
      form: {
        groups: [
          {
            label: "Server settings",
            fields: [
              {
                label: "URL",
                key: "name",
                type: "text",
                help: "The url of the server? For example: https://my.nextcloud.com",
              },
            ],
          },
        ],
      },
    },
  ],
})
preferences.on("click", (key) => {
  if (key === "resetButton") {
    resetApp()
  }
})

const quit = () => {
  app.exit(0)
}

const toggleVisibility = () => {
  win.show()
  win.focus()
}

const createTray = () => {
  const iconPath = path.join(__dirname, "/icons/icon.png")
  tray = new Tray(iconPath)

  const contextMenu = Menu.buildFromTemplate([
    { label: "&Show window", accelerator: "Ctrl+S", click: toggleVisibility },
    { label: "&Exit", accelerator: "Ctrl+Q", click: quit },
  ])
  tray.setToolTip("Nextcloud talk.")
  tray.setContextMenu(contextMenu)
}

const changeTrayNormal = () => {
  const iconPath = path.join(__dirname, "/icons/icon.png")
  tray.setImage(iconPath)
}

const changeTrayUrgent = () => {
  const iconPath = path.join(__dirname, "/icons/iconurgent.png")
  tray.setImage(iconPath)
}

const createWindow = () => {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders["User-Agent"] =
      "Mozilla/5.0 (X11 Fedora Linux x86_64 rv:99.0) Gecko/20100101 Firefox/99.0"
    callback({ cancel: false, requestHeaders: details.requestHeaders })
  })

  session
    .fromPartition("some-partition")
    .setPermissionRequestHandler((webContents, permission, callback) => {
      const url = webContents.getURL()

      if (permission === "notifications") {
        callback(true)
      }

      if (!url.startsWith(serverURL)) {
        return callback(false)
      }
    })

  win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: __dirname + "/icons/icon.png",
    preload: __dirname + "/preload.js",
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: true,
      allowRunningInsecureContent: true,
      enableRemoteModule: true,
      preload: __dirname + "/preload.js",
    },
  })

  win.on("close", function (event) {
    if (!app.isQuiting) {
      event.preventDefault()
      win.hide()
    }
    return false
  })

  win.on("focus", () => {
    console.log("focus")
    changeTrayNormal()
  })
}

app.whenReady().then(() => {
  serverURL = preferences.value("server.name")

  if (serverURL == null || serverURL == "") {
    preferencesWindow = preferences.show()

    preferencesWindow.on("close", (e) => {
      utils.loadURL()
    })
  }

  createTray()
  createWindow()
  utils.loadURL()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("web-contents-created", (event, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)

    if (parsedUrl.origin !== serverURL) {
      event.preventDefault()
    }
  })
})

ipcMain.on("notification-show", (event, message) => {
  if (!win.isFocused()) {
    changeTrayUrgent()
    new Notification(message).show()
  }
})
