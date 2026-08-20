const { contextBridge, ipcRenderer } = require('electron');

// Exposes a tiny, safe API to the (remote) UI so it can set a taskbar badge with
// the number of new tickets/appointment requests. In a normal browser this
// object simply doesn't exist, and the UI skips the badge.
contextBridge.exposeInMainWorld('wpBadge', {
  set: (dataUrl, count) => ipcRenderer.send('wp-badge', { dataUrl: dataUrl || null, count: count || 0 }),
});
