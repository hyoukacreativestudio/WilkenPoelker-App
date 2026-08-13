import React, { useEffect, useState } from 'react';
import { api, unwrap } from '../api.js';
import { colorForRole } from '../config.js';

// A friendly landing screen: the numbers that matter for this department, as
// clickable cards. Each card only shows if the department has that module.
export default function Dashboard({ user, go, modules }) {
  const has = (k) => modules.some((m) => m.key === k);
  const color = colorForRole(user.role);
  const [c, setC] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const out = {};
      const tryGet = async (key, fn) => { try { out[key] = await fn(); } catch { out[key] = null; } };
      await Promise.all([
        has('bestellungen') && tryGet('orders', async () => (unwrap(await api.get('/desktop/orders?status=open')).orders || []).length),
        has('lager') && tryGet('lager', async () => (unwrap(await api.get('/desktop/warehouse?status=requested')).items || []).length),
        has('reparaturen') && tryGet('rep', async () => unwrap(await api.get('/repairs/outreach?filter=open&scope=no_account')).counts?.open ?? 0),
        has('tickets') && tryGet('tickets', async () => { const r = unwrap(await api.get('/service/tickets/all?status=open')); return (r.tickets || r.items || []).length; }),
        has('termine') && tryGet('termine', async () => { const r = unwrap(await api.get('/appointments')); const list = r.appointments || r.items || (Array.isArray(r) ? r : []); const today = new Date().toISOString().slice(0, 10); return list.filter((a) => (a.date || '').slice(0, 10) === today).length; }),
      ].filter(Boolean));
      if (alive) { setC(out); setLoading(false); }
    })();
    return () => { alive = false; };
    /* eslint-disable-next-line */
  }, []);

  const cards = [
    has('termine')      && { key: 'termine',      icon: '📅', label: 'Termine heute',        n: c.termine, hint: 'Aus der App', bg: '#eaf4ff', fg: '#2563eb' },
    has('reparaturen')  && { key: 'reparaturen',  icon: '🔧', label: 'Nicht erreicht',       n: c.rep,     hint: 'Kunden anrufen', bg: '#fff2e8', fg: '#dd6b20' },
    has('tickets')      && { key: 'tickets',      icon: '💬', label: 'Offene Tickets',       n: c.tickets, hint: 'Zu bearbeiten', bg: '#f0ecff', fg: '#7c3aed' },
    has('bestellungen') && { key: 'bestellungen', icon: '📦', label: 'Offene Bestellungen',  n: c.orders,  hint: 'Noch nicht bestellt', bg: '#fdeaea', fg: '#dc2626' },
    has('lager')        && { key: 'lager',        icon: '🏬', label: 'Lager offen',          n: c.lager,   hint: 'Nach vorne bringen', bg: '#eef1f4', fg: '#475569' },
  ].filter(Boolean);

  const hi = (user.firstName || user.username || '').trim();

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 750 }}>Hallo{hi ? `, ${hi}` : ''} 👋</div>
        <div className="muted">Hier ist ein Überblick für deine Abteilung.</div>
      </div>

      {loading ? (
        <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : cards.length === 0 ? (
        <div className="empty">Keine Kennzahlen für diese Abteilung.</div>
      ) : (
        <div className="grid-cards">
          {cards.map((card, i) => (
            <div key={card.key} className="stat" style={{ animationDelay: `${i * 40}ms` }} onClick={() => go(card.key)}>
              <div className="top">
                <div className="ic" style={{ background: card.bg, color: card.fg }}>{card.icon}</div>
                <span className="muted" style={{ fontSize: 20 }}>›</span>
              </div>
              <div className="num" style={{ color: card.n ? color : 'var(--text-3)' }}>{card.n ?? '–'}</div>
              <div className="lbl">{card.label}</div>
              <div className="hint">{card.hint}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
