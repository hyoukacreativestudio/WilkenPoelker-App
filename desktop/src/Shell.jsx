import React, { useEffect, useMemo, useState } from 'react';
import { modulesForRole, labelForRole, colorForRole, ROLE_INFO } from './config.js';
import Dashboard from './pages/Dashboard.jsx';
import Termine from './pages/Termine.jsx';
import Reparaturen from './pages/Reparaturen.jsx';
import Tickets from './pages/Tickets.jsx';
import Bestellungen from './pages/Bestellungen.jsx';
import Lager from './pages/Lager.jsx';
import Kundennummern from './pages/Kundennummern.jsx';
import RobbyKunden from './pages/RobbyKunden.jsx';
import Kalender from './pages/Kalender.jsx';

const PAGES = { termine: Termine, kalender: Kalender, reparaturen: Reparaturen, tickets: Tickets, robbykunden: RobbyKunden, kundennummern: Kundennummern, bestellungen: Bestellungen, lager: Lager };

const SUBTITLES = {
  uebersicht: 'Überblick für deine Abteilung',
  termine: 'Termine aus der App – automatisch eingetragen',
  kalender: 'Terminübersicht im Monatskalender',
  reparaturen: 'Noch nicht erreichte Kunden anrufen',
  tickets: 'Tickets deiner Abteilung bearbeiten',
  robbykunden: 'Alle Kunden mit einem Robby',
  kundennummern: 'Kundennummer-Anfragen bearbeiten',
  bestellungen: 'Bestellungen sammeln und aufgeben',
  lager: 'Was aus dem Lager nach vorne soll',
};

export default function Shell({ user, onLogout }) {
  const modules = useMemo(() => modulesForRole(user.role), [user.role]);
  const [active, setActive] = useState('uebersicht');
  const [dark, setDark] = useState(() => localStorage.getItem('wp_theme') === 'dark');
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
          <button className="theme-toggle" onClick={() => setDark((d) => !d)} title={dark ? 'Heller Modus' : 'Dunkler Modus'}>
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
        <div className="content" key={active}>
          {active === 'uebersicht'
            ? <Dashboard user={user} modules={modules} go={setActive} />
            : <Page user={user} />}
        </div>
      </main>
    </div>
  );
}
