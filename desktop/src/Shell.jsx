import React, { useEffect, useMemo, useState } from 'react';
import { modulesForRole, labelForRole, colorForRole, ROLE_INFO } from './config.js';
import { api, unwrap, pendingCount, flushQueue } from './api.js';
import { useToast } from './toast.jsx';

// Draw a small red badge with the count and hand it to Electron for the taskbar.
function setTaskbarBadge(count) {
  if (typeof window === 'undefined' || !window.wpBadge) return; // only inside the .exe
  if (!count) { window.wpBadge.set(null, 0); return; }
  try {
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = '#E53E3E'; g.beginPath(); g.arc(16, 16, 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(count > 99 ? '99+' : String(count), 16, 17);
    window.wpBadge.set(c.toDataURL(), count);
  } catch (e) { /* ignore */ }
}
import Dashboard from './pages/Dashboard.jsx';
import Termine from './pages/Termine.jsx';
import Reparaturen from './pages/Reparaturen.jsx';
import Tickets from './pages/Tickets.jsx';
import Bestellungen from './pages/Bestellungen.jsx';
import Lager from './pages/Lager.jsx';
import Kundennummern from './pages/Kundennummern.jsx';
import RobbyKunden from './pages/RobbyKunden.jsx';
import Kalender from './pages/Kalender.jsx';
import TermineHeute from './pages/TermineHeute.jsx';
import ReparaturenHeute from './pages/ReparaturenHeute.jsx';
import Quellen from './pages/Quellen.jsx';
import HiddenTools from './pages/HiddenTools.jsx';

const PAGES = { termine: Termine, kalender: Kalender, termineheute: TermineHeute, reparaturenheute: ReparaturenHeute, reparaturen: Reparaturen, tickets: Tickets, robbykunden: RobbyKunden, kundennummern: Kundennummern, bestellungen: Bestellungen, quellen: Quellen, lager: Lager };

const SUBTITLES = {
  uebersicht: 'Überblick für deine Abteilung',
  termine: 'Termine aus der App – automatisch eingetragen',
  kalender: 'Terminübersicht im Monatskalender',
  termineheute: 'Reparaturen für heute – abhaken oder Warnung setzen',
  reparaturenheute: 'Reparaturen den Werkstatt-Mitarbeitern zuteilen',
  reparaturen: 'Noch nicht erreichte Kunden anrufen',
  tickets: 'Tickets deiner Abteilung bearbeiten',
  robbykunden: 'Alle Kunden mit einem Robby',
  kundennummern: 'Kundennummer-Anfragen bearbeiten',
  bestellungen: 'Bestellungen sammeln und aufgeben',
  quellen: 'Doppelte Quellen zusammenführen',
  lager: 'Was aus dem Lager nach vorne soll',
};

export default function Shell({ user, onLogout }) {
  const modules = useMemo(() => modulesForRole(user.role), [user.role]);
  const [active, setActive] = useState('uebersicht');
  const [dark, setDark] = useState(() => localStorage.getItem('wp_theme') === 'dark');
  const [pending, setPending] = useState(pendingCount());
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [notifs, setNotifs] = useState([]);      // notification rows
  const [notifOpen, setNotifOpen] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false); // hidden admin tools
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const darkClicks = React.useRef([]);
  // Secret: 3 quick taps on the dark-mode button (admin only) open the tools.
  const onDarkClick = () => {
    setDark((d) => !d);
    if (!isAdmin) return;
    const t = Date.now();
    darkClicks.current = darkClicks.current.filter((x) => t - x < 800);
    darkClicks.current.push(t);
    if (darkClicks.current.length >= 3) { darkClicks.current = []; setHiddenOpen(true); }
  };
  const unread = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);

  // Poll notifications for this account → badge = unread; panel lists them.
  // A toast pops for newly-arrived unread ones, so they're seen even when AFK.
  const toast = useToast();
  const seenRef = React.useRef(null);
  const loadNotifs = React.useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=30');
      const list = unwrap(res).notifications || [];
      if (seenRef.current) {
        const fresh = list.filter((n) => !n.read && !seenRef.current.has(n.id));
        if (fresh.length === 1) toast(`🔔 ${fresh[0].title}`, { type: 'info', duration: 6000 });
        else if (fresh.length > 1) toast(`🔔 ${fresh.length} neue Benachrichtigungen`, { type: 'info', duration: 6000 });
      }
      seenRef.current = new Set(list.map((n) => n.id));
      setNotifs(list);
    } catch { /* ignore */ }
  }, [toast]);
  useEffect(() => {
    let active = true;
    const t = setInterval(() => { if (active) loadNotifs(); }, 20000);
    loadNotifs();
    // Refresh immediately when the window regains focus (came back from AFK).
    const onFocus = () => { if (active) loadNotifs(); };
    window.addEventListener('focus', onFocus);
    return () => { active = false; clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [loadNotifs]);
  useEffect(() => { setTaskbarBadge(unread); }, [unread]);

  // Close the notification panel when clicking anywhere outside it.
  useEffect(() => {
    if (!notifOpen) return undefined;
    const onDoc = (e) => { const el = e.target; if (!el || !el.closest) return; if (!el.closest('.notif-panel') && !el.closest('[data-notif-bell]')) setNotifOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [notifOpen]);

  const markRead = async (n) => {
    if (n.read) return;
    setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    try { await api.put(`/notifications/${n.id}/read`); } catch { loadNotifs(); }
  };
  // Map a notification to the module to open when it's clicked.
  const notifTarget = (n) => {
    const c = `${n.category || ''} ${n.relatedType || ''} ${n.type || ''}`.toLowerCase();
    let key = 'uebersicht';
    if (c.includes('appointment') || c.includes('termin')) key = 'termine';
    else if (c.includes('ticket') || c.includes('chat')) key = 'tickets';
    else if (c.includes('order') || c.includes('bestell')) key = 'bestellungen';
    else if (c.includes('warehouse') || c.includes('lager')) key = 'lager';
    else if (c.includes('customer') || c.includes('kundennummer')) key = 'kundennummern';
    return modules.some((m) => m.key === key) ? key : 'uebersicht';
  };
  const onNotifClick = (n) => { markRead(n); setActive(notifTarget(n)); setNotifOpen(false); };

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((x) => ({ ...x, read: true })));
    try { await api.put('/notifications/read-all'); } catch { loadNotifs(); }
  };

  // Track offline status + how many changes are waiting to sync.
  useEffect(() => {
    const upd = () => setPending(pendingCount());
    const on = () => { setOnline(true); flushQueue(); };
    const off = () => setOnline(false);
    window.addEventListener('wp-queue', upd);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const t = setInterval(upd, 5000);
    return () => { window.removeEventListener('wp-queue', upd); window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(t); };
  }, []);
  const deptLabel = labelForRole(user.role);
  const deptColor = colorForRole(user.role);
  const icon = ROLE_INFO[user.role]?.icon || '🌿';

  // Theme the whole app with the department color
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--dept', deptColor);
    root.style.setProperty('--dept-soft', `${deptColor}22`);
  }, [deptColor]);

  // Light / dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('wp_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const activeMod = modules.find((m) => m.key === active) || modules[0];
  const Page = active === 'uebersicht' ? null : (PAGES[active] || (() => <div className="empty">Modul nicht verfügbar</div>));

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="logo">{icon}</span> WilkenPoelker</div>
        <span className="dept-chip">{deptLabel}</span>
        <nav className="nav">
          {modules.map((m) => (
            <button key={m.key} className={active === m.key ? 'active' : ''} onClick={() => setActive(m.key)}>
              <span className="ic">{m.icon}</span> {m.label}
            </button>
          ))}
        </nav>
        <div className="foot">
          <div className="who">👤 {(user.firstName || user.username || 'Angemeldet')} {user.lastName || ''}</div>
          <button onClick={onLogout}>⎋ Abmelden / wechseln</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <span style={{ fontSize: 26 }}>{activeMod?.icon}</span>
          <div>
            <h1>{activeMod?.label}</h1>
            <div className="sub">{SUBTITLES[active] || ''}</div>
          </div>
          <div className="spacer" />
          <div style={{ position: 'relative', marginRight: 8 }}>
            <button className="theme-toggle" data-notif-bell onClick={() => { setNotifOpen((o) => !o); if (!notifOpen) loadNotifs(); }} title="Benachrichtigungen">
              🔔{unread > 0 ? <span className="badge" style={{ background: '#E53E3E', color: '#fff', marginLeft: 4 }}>{unread}</span> : null}
            </button>
            {notifOpen && (
              <div className="notif-panel" onClick={(e) => e.stopPropagation()}>
                <div className="notif-head">
                  <strong>Benachrichtigungen</strong>
                  <button className="btn sm ghost" onClick={markAllRead} disabled={unread === 0}>Alle als gelesen</button>
                </div>
                <div className="notif-list">
                  {notifs.length === 0 ? <div className="muted" style={{ padding: 14, textAlign: 'center' }}>Keine Benachrichtigungen.</div>
                    : notifs.map((n) => (
                      <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`} style={{ cursor: 'pointer' }} onClick={() => onNotifClick(n)}>
                        <div className="notif-title">{!n.read ? <span className="dot" /> : null}{n.title}</div>
                        <div className="notif-msg">{n.message}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          {(!online || pending > 0) && (
            <span className="badge" style={{ background: online ? '#fff6e0' : '#f8d7da', color: online ? '#97650a' : '#a52834', marginRight: 8 }}
              title={online ? 'Änderungen werden synchronisiert' : 'Offline – Änderungen werden gespeichert und später gesendet'}>
              {online ? '⏳' : '📴 Offline'}{pending > 0 ? ` · ${pending} wartet` : ''}
            </span>
          )}
          <button className="theme-toggle" onClick={onDarkClick} title={dark ? 'Heller Modus' : 'Dunkler Modus'}>
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
        <div className="content" key={active}>
          {active === 'uebersicht'
            ? <Dashboard user={user} modules={modules} go={setActive} />
            : <Page user={user} />}
        </div>
      </main>
      {hiddenOpen && <HiddenTools user={user} onClose={() => setHiddenOpen(false)} />}
    </div>
  );
}
