import React, { useMemo, useState } from 'react';
import { modulesForRole, labelForRole, colorForRole } from './config.js';
import Termine from './pages/Termine.jsx';
import Reparaturen from './pages/Reparaturen.jsx';
import Tickets from './pages/Tickets.jsx';
import Bestellungen from './pages/Bestellungen.jsx';
import Lager from './pages/Lager.jsx';

const PAGES = { termine: Termine, reparaturen: Reparaturen, tickets: Tickets, bestellungen: Bestellungen, lager: Lager };

export default function Shell({ user, onLogout }) {
  const modules = useMemo(() => modulesForRole(user.role), [user.role]);
  const [active, setActive] = useState(modules[0]?.key || 'termine');
  const deptLabel = labelForRole(user.role);
  const deptColor = colorForRole(user.role);
  const Page = PAGES[active] || (() => <div className="empty">Modul nicht verfügbar</div>);
  const activeLabel = modules.find((m) => m.key === active)?.label || '';

  return (
    <div className="app">
      <aside className="sidebar" style={{ background: deptColor }}>
        <div className="brand">WilkenPoelker</div>
        <div className="dept">Abteilung: {deptLabel}</div>
        <nav className="nav">
          {modules.map((m) => (
            <button key={m.key} className={active === m.key ? 'active' : ''} onClick={() => setActive(m.key)}>
              {m.label}
            </button>
          ))}
        </nav>
        <div className="foot">
          <div style={{ padding: '0 4px 10px', fontSize: 13, opacity: .85 }}>
            {(user.firstName || user.username || '')} {user.lastName || ''}
          </div>
          <button onClick={onLogout}>Abmelden</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <h1>{activeLabel}</h1>
          <span className="badge" style={{ background: deptColor }}>{deptLabel}</span>
        </div>
        <div className="content">
          <Page user={user} />
        </div>
      </main>
    </div>
  );
}
