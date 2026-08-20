// Exposes a tiny, safe API to the UI so it can set a taskbar badge with the
// number of new tickets/appointment requests. In a normal browser this object
// simply doesn't exist and the UI skips the badge. Wrapped defensively so a
// preload hiccup can never break the page (e.g. keyboard input).
try {
  const { contextBridge, ipcRenderer } = require('electron');
  contextBridge.exposeInMainWorld('wpBadge', {
    set: (dataUrl, count) => { try { ipcRenderer.send('wp-badge', { dataUrl: dataUrl || null, count: count || 0 }); } catch (e) {} },
  });
} catch (e) { /* never let the preload break the renderer */ }
