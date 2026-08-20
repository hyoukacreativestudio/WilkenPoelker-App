const { app, BrowserWindow, Menu, shell, ipcMain, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');

// Native desktop shell. Loads the UI from the server (auto-update) when it's
// reachable, otherwise from the bundled copy (offline). Both talk to the live
// backend at .../api.
const REMOTE_URL = process.env.WP_PC_URL || 'https://api.wilkenpoelker.de/pc/';
const LOCAL_FILE = path.join(__dirname, '..', 'dist-electron', 'index.html');

// Quick reachability check (no fetch dependency) so we make ONE clean load
// decision instead of loading twice and racing.
function remoteReachable() {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
    try {
      const lib = REMOTE_URL.startsWith('https') ? https : http;
      const req = lib.get(REMOTE_URL, (res) => { finish(res.statusCode >= 200 && res.statusCode < 500); res.destroy(); });
      req.on('error', () => finish(false));
      req.setTimeout(3500, () => { req.destroy(); finish(false); });
    } catch (e) { finish(false); }
  });
}

let win;
async function createWindow() {
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
      sandbox: false,
      webSecurity: false, // internal trusted tool; page may call the API cross-origin
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  Menu.setApplicationMenu(null);

  const ok = await remoteReachable();
  if (ok) win.loadURL(REMOTE_URL, { extraHeaders: 'pragma: no-cache\n' });
  else win.loadFile(LOCAL_FILE);

  // Press F12 (or Ctrl+Shift+I) to open the developer console for diagnostics.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // External links (e.g. Amazon) open in the real browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
}

// Taskbar badge: the UI sends a rendered number image + count.
ipcMain.on('wp-badge', (event, { dataUrl, count }) => {
  if (!win) return;
  try {
    if (dataUrl && count > 0) win.setOverlayIcon(nativeImage.createFromDataURL(dataUrl), `${count} neue`);
    else win.setOverlayIcon(null, '');
    if (app.setBadgeCount) app.setBadgeCount(count || 0);
  } catch (e) { /* overlay not supported on this platform */ }
});

app.whenReady().then(createWindow);
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
