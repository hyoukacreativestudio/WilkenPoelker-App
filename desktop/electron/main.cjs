const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Native desktop shell. It loads the UI STRAIGHT FROM THE SERVER
// (https://api.wilkenpoelker.de/pc) so every server deploy (git pull) updates
// all company PCs automatically on next open — no more copying a new .exe.
// If the server is unreachable (offline), it falls back to the bundled UI in
// dist-electron. Both talk to the live backend at .../api.
const REMOTE_URL = process.env.WP_PC_URL || 'https://api.wilkenpoelker.de/pc/';
const LOCAL_FILE = path.join(__dirname, '..', 'dist-electron', 'index.html');

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
      webSecurity: false, // internal trusted tool; page may call the API cross-origin
    },
  });

  Menu.setApplicationMenu(null);

  // If the remote UI can't load (offline / server down), fall back to the
  // bundled copy exactly once, so the program still opens.
  let usedFallback = false;
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && !usedFallback && /^https?:/.test(validatedURL)) {
      usedFallback = true;
      win.loadFile(LOCAL_FILE);
    }
  });

  // Always revalidate the document so a new deploy is picked up immediately.
  win.loadURL(REMOTE_URL, { extraHeaders: 'pragma: no-cache\n' });

  // External links (e.g. Amazon) open in the real browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
}

app.whenReady().then(createWindow);
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
