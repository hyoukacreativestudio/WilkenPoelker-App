import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';

// Month calendar of appointments. Service sees the Fahrrad calendar (max 6/day,
// so free days are obvious); Robby sees the Robby calendar (no limit). Admin can
// pick a department. Appointments come from the same /desktop/appointments feed.
const DEPTS = [
  { key: 'fahrrad', label: 'Fahrrad' }, { key: 'reinigung', label: 'Kärcher' },
  { key: 'rasenmaeher', label: 'Rasenmäher' }, { key: 'service', label: 'Service' },
  { key: 'robby', label: 'Robby' }, { key: 'motorgeraete', label: 'Motorgeräte' },
  { key: 'elektro', label: 'Elektrofahrzeuge' }, { key: 'verkauf', label: 'Verkauf' },
  { key: 'lieferungen', label: 'Lieferungen' },
];
const CONFIG = {
  service_manager: { dept: 'fahrrad', limit: 6 },
  robby_manager: { dept: 'robby', limit: null },
  cleaning_manager: { dept: 'reinigung', limit: null },
  admin: { dept: 'fahrrad', limit: null, pick: true },
  super_admin: { dept: 'fahrrad', limit: null, pick: true },
};
// Departments that take no appointments on certain weekdays (0=So … 6=Sa).
// Fahrrad: no appointments Fri/Sat/Sun — those days show red with 0.
const CLOSED_WEEKDAYS = {
  fahrrad: [5, 6, 0],
};
const isClosedDay = (dept, day) => (CLOSED_WEEKDAYS[dept] || []).includes(day.getDay());
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Kalender({ user }) {
  const toast = useToast();
  const cfg = CONFIG[user.role] || { dept: 'fahrrad', limit: null, pick: true };
  const [dept, setDept] = useState(cfg.dept);
  const limit = cfg.limit;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [openDay, setOpenDay] = useState(null); // iso date string of the enlarged day
  const [times, setTimes] = useState({});        // { apptId: 'HH:MM' } local edits

  const load = async () => {
    setLoading(true);
    try { setRows(unwrap(await api.get('/desktop/appointments')).appointments || []); }
    catch (e) { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveTime = async (a) => {
    const t = times[a.id] !== undefined ? times[a.id] : (a.startTime ? String(a.startTime).slice(0, 5) : '');
    try { await api.patch(`/desktop/appointments/${a.id}`, { startTime: t || null }); toast('Uhrzeit gespeichert'); await load(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  // Appointments for this department, grouped by day (YYYY-MM-DD).
  const byDay = useMemo(() => {
    const map = {};
    rows.filter((a) => (a.department || '') === dept && a.date && a.status !== 'cancelled').forEach((a) => {
      const k = String(a.date).slice(0, 10);
      (map[k] = map[k] || []).push(a);
    });
    return map;
  }, [rows, dept]);

  // Build the weeks grid for the current month (Mon-first).
  const weeks = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startOffset = (first.getDay() + 6) % 7; // Mon=0
    const start = new Date(cursor.y, cursor.m, 1 - startOffset);
    const out = [];
    for (let w = 0; w < 6; w++) {
      const row = [];
      for (let d = 0; d < 7; d++) { const day = new Date(start); day.setDate(start.getDate() + w * 7 + d); row.push(day); }
      out.push(row);
    }
    return out;
  }, [cursor]);

  const move = (delta) => setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const todayIso = iso(new Date());

  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn ghost" onClick={() => move(-1)}>← Vorheriger</button>
        <strong style={{ minWidth: 160, textAlign: 'center' }}>{MONTHS[cursor.m]} {cursor.y}</strong>
        <button className="btn ghost" onClick={() => move(1)}>Nächster →</button>
        <div className="spacer" />
        {cfg.pick && (
          <select className="select" value={dept} onChange={(e) => setDept(e.target.value)}>
            {DEPTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        )}
        {limit ? <span className="muted">max. {limit} pro Tag — grün = frei, rot = voll</span> : <span className="muted">ohne Limit</span>}
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
        <div className="cal">
          <div className="cal-head">{WD.map((d) => <div key={d} className="cal-wd">{d}</div>)}</div>
          {weeks.map((week, wi) => (
            <div key={wi} className="cal-row">
              {week.map((day) => {
                const k = iso(day);
                const list = byDay[k] || [];
                const inMonth = day.getMonth() === cursor.m;
                const closed = isClosedDay(dept, day);
                const full = limit && list.length >= limit;
                return (
                  <div key={k} className="cal-cell" style={{ opacity: inMonth ? 1 : 0.4, background: closed ? '#f8d7da55' : undefined, borderColor: k === todayIso ? 'var(--dept)' : undefined, cursor: 'pointer' }} onClick={() => setOpenDay(k)}>
                    <div className="cal-daynum">
                      <span>{day.getDate()}</span>
                      {closed ? <span className="badge" style={{ background: '#f8d7da', color: '#a52834', fontSize: 11 }}>0 · zu</span>
                             : limit ? <span className="badge" style={{ background: full ? '#f8d7da' : '#d3f2df', color: full ? '#a52834' : '#1f7a45', fontSize: 11 }}>{list.length}/{limit}{full ? ' voll' : ''}</span>
                             : (list.length ? <span className="badge open" style={{ fontSize: 11 }}>{list.length}</span> : null)}
                    </div>
                    <div className="cal-items">
                      {list.slice(0, 6).map((a) => (
                        <div key={a.id} className="cal-item" title={`${a.title || ''} ${a.customerName || ''}`}>
                          {a.startTime ? <b>{String(a.startTime).slice(0, 5)} </b> : null}{a.customerName || a.title || 'Termin'}
                        </div>
                      ))}
                      {list.length > 6 ? <div className="muted" style={{ fontSize: 11 }}>+{list.length - 6} mehr</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Enlarged day: list appointments, add/change times */}
      {openDay && (
        <div className="backdrop" onClick={() => setOpenDay(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 640 }}>
            <h2>{openDay.split('-').reverse().join('.')}{limit ? ` · ${(byDay[openDay] || []).length}/${limit}` : ''}</h2>
            {isClosedDay(dept, new Date(openDay)) ? (
              <div className="badge" style={{ background: '#f8d7da', color: '#a52834', marginBottom: 8 }}>Geschlossen – an diesem Wochentag keine Termine</div>
            ) : null}
            {(byDay[openDay] || []).length === 0 ? (
              <div className="muted" style={{ padding: 12 }}>Keine Termine an diesem Tag.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                {(byDay[openDay] || []).slice().sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || ''))).map((a) => (
                  <div key={a.id} className="card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <input className="input" type="time" style={{ width: 110 }}
                      value={times[a.id] !== undefined ? times[a.id] : (a.startTime ? String(a.startTime).slice(0, 5) : '')}
                      onChange={(e) => setTimes((t) => ({ ...t, [a.id]: e.target.value }))} />
                    <button className="btn sm" onClick={() => saveTime(a)}>Uhrzeit speichern</button>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <strong>{a.customerName || a.title || 'Termin'}</strong>
                      {a.customerNumber ? <span className="muted"> · Kd {a.customerNumber}</span> : null}
                      <div className="muted" style={{ fontSize: 12 }}>{a.title || ''}{a.phone ? ` · ☎ ${a.phone}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
              <button className="btn" onClick={() => setOpenDay(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
