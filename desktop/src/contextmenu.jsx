import React, { useEffect, useRef, useState } from 'react';

// A right-click menu (Ausschneiden / Kopieren / Einfügen / Alles auswählen) for
// the Electron .exe, which otherwise has NO context menu at all. In a normal
// browser we stay out of the way — the browser's own menu already does paste.
const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);
const TEXT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number', '']);

function editableInput(el) {
  if (!el || !el.tagName) return null;
  if (el.tagName === 'TEXTAREA' && !el.disabled && !el.readOnly) return el;
  if (el.tagName === 'INPUT' && TEXT_TYPES.has((el.type || '').toLowerCase()) && !el.disabled && !el.readOnly) return el;
  return null;
}
// React-controlled inputs ignore a direct `el.value = …`; go through the native
// setter and dispatch an input event so onChange (and React state) update.
function setNativeValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc.set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
const hasRange = (el) => { try { return el.selectionStart != null; } catch { return false; } };
const inputSelection = (el) => (hasRange(el) && el.selectionStart !== el.selectionEnd ? el.value.slice(el.selectionStart, el.selectionEnd) : '');
const windowSelection = () => { try { return String(window.getSelection ? window.getSelection() : ''); } catch { return ''; } };

export default function ContextMenu() {
  const [menu, setMenu] = useState(null); // { x, y, el, canCut, canCopy }
  const ref = useRef(null);

  useEffect(() => {
    if (!isElectron || window.wpNativeMenu) return undefined; // browser / future native menu: do nothing
    const onCtx = (e) => {
      const el = editableInput(e.target);
      const sel = windowSelection();
      if (!el && !sel) return;                 // nothing to act on → let default happen
      e.preventDefault();
      const isel = el ? inputSelection(el) : '';
      setMenu({ x: e.clientX, y: e.clientY, el, canCut: !!(el && isel), canCopy: !!(isel || sel) });
    };
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(null); };
    const onKey = (e) => { if (e.key === 'Escape') setMenu(null); };
    const onScroll = () => setMenu(null);
    document.addEventListener('contextmenu', onCtx);
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('blur', onScroll);
    return () => {
      document.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onScroll);
    };
  }, []);

  if (!menu) return null;
  const close = () => setMenu(null);

  const copy = async () => {
    const text = (menu.el && inputSelection(menu.el)) || windowSelection();
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    close();
  };
  const cut = async () => {
    const el = menu.el; if (!el) return close();
    const s = el.selectionStart, en = el.selectionEnd;
    try { await navigator.clipboard.writeText(el.value.slice(s, en)); } catch { /* ignore */ }
    setNativeValue(el, el.value.slice(0, s) + el.value.slice(en));
    try { el.focus(); el.setSelectionRange(s, s); } catch { /* ignore */ }
    close();
  };
  const paste = async () => {
    const el = menu.el; if (!el) return close();
    let text = '';
    try { text = await navigator.clipboard.readText(); } catch { close(); return; }
    el.focus();
    if (hasRange(el)) {
      const s = el.selectionStart, en = el.selectionEnd;
      setNativeValue(el, el.value.slice(0, s) + text + el.value.slice(en));
      const pos = s + text.length; try { el.setSelectionRange(pos, pos); } catch { /* ignore */ }
    } else {
      setNativeValue(el, (el.value || '') + text);
    }
    close();
  };
  const selectAll = () => { try { menu.el.focus(); menu.el.select(); } catch { /* ignore */ } close(); };

  const items = [];
  if (menu.el) items.push(['Ausschneiden', cut, !menu.canCut]);
  items.push(['Kopieren', copy, !menu.canCopy]);
  if (menu.el) { items.push(['Einfügen', paste, false]); items.push(['Alles auswählen', selectAll, false]); }

  const x = Math.min(menu.x, (window.innerWidth || 9999) - 196);
  const y = Math.min(menu.y, (window.innerHeight || 9999) - (items.length * 38 + 14));

  return (
    <div ref={ref} className="ctx-menu" style={{ left: Math.max(4, x), top: Math.max(4, y) }} onContextMenu={(e) => e.preventDefault()}>
      {items.map(([label, fn, disabled], i) => (
        <button key={i} className="ctx-item" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={fn}>{label}</button>
      ))}
    </div>
  );
}
