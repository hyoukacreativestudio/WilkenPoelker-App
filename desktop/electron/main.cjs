const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Native desktop app. Loads the bundled UI (dist-electron) which talks to the
// live backend at https://api.wilkenpoelker.de/api. webSecurity is relaxed so the
// packaged file:// page may call the API cross-origin (internal trusted tool).

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#2E7D32',
    title: 'WilkenPoelker',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // allow the bundled page to call the live API
    },
  });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'dist-electron', 'index.html'));

  // External links (e.g. Amazon) open in the real browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
}

app.whenReady().then(createWindow);
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
