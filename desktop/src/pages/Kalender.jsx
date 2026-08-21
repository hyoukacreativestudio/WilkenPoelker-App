import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';
import { TYPES } from './Termine.jsx';

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
// Per-role calendar setup.
//  dept     = which calendar opens by default (matches the department an
//             appointment is tagged with).
//  pick     = may switch to ANY calendar (Service + admins).
//  readOnly = may view but not create/edit (Fahrrad sees the bike calendar the
//             Service account manages).
// Service manages the Fahrrad (bike) calendar and defaults to it, but can open
// every other calendar too.
const CONFIG = {
  service_manager: { dept: 'fahrrad', pick: true },
  bike_manager: { dept: 'fahrrad', readOnly: true },
  robby_manager: { dept: 'robby' },
  cleaning_manager: { dept: 'reinigung' },
  admin: { dept: 'fahrrad', pick: true },
  super_admin: { dept: 'fahrrad', pick: true },
};
// Rules per calendar (not per role): the Fahrrad calendar caps at 6/day and
// takes no appointments Fri/Sat/Sun (those days show red with 0). Other
// calendars have no limit. Whatever calendar is selected, its own rules apply.
const DEPT_RULES = {
  fahrrad: { limit: 6, closed: [5, 6, 0] },
};
const isClosedDay = (dept, day) => (DEPT_RULES[dept]?.closed || []).includes(day.getDay());
const savedHandle = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('wp_handle') || '' : '');
const emptyForm = (date = '') => ({ title: '', type: 'repair', date, startTime: '', endTime: '', customerName: '', customerNumber: '', phone: '', description: '', handle: savedHandle() });
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Easter Sunday (Meeus/Jones/Butcher algorithm) — anchor for the moving holidays.
function easterSunday(Y) {
  const a = Y % 19, b = Math.floor(Y / 100), c = Y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Y, month - 1, day);
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Statutory public holidays in Lower Saxony (Niedersachsen), Germany.
function lowerSaxonyHolidays(Y) {
  const es = easterSunday(Y);
  return {
    [iso(new Date(Y, 0, 1))]: 'Neujahr',
    [iso(addDays(es, -2))]: 'Karfreitag',
    [iso(addDays(es, 1))]: 'Ostermontag',
    [iso(new Date(Y, 4, 1))]: 'Tag der Arbeit',
    [iso(addDays(es, 39))]: 'Christi Himmelfahrt',
    [iso(addDays(es, 50))]: 'Pfingstmontag',
    [iso(new Date(Y, 9, 3))]: 'Tag der Deutschen Einheit',
    [iso(new Date(Y, 9, 31))]: 'Reformationstag',
    [iso(new Date(Y, 11, 25))]: '1. Weihnachtstag',
    [iso(new Date(Y, 11, 26))]: '2. Weihnachtstag',
  };
}

export default function Kalender({ user }) {
  const toast = useToast();
  const cfg = CONFIG[user.role] || { dept: 'fahrrad', pick: true };
  const [dept, setDept] = useState(cfg.dept);
  const limit = DEPT_RULES[dept]?.limit || null; // depends on the SELECTED calendar
  const readOnly = !!cfg.readOnly;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [openDay, setOpenDay] = useState(null); // iso date string of the enlarged day
  const [times, setTimes] = useState({});        // { apptId: 'HH:MM' } local edits
  const [createForm, setCreateForm] = useState(null); // form object when creating a new appointment
  const [busy, setBusy] = useState(false);
  const [extraClosed, setExtraClosed] = useState({}); // admin-configured closures { iso: name }

  // Statutory Lower-Saxony holidays (computed) + any admin-configured closed days
  // → blocked in EVERY calendar. Covers the years the grid can touch.
  const holidays = useMemo(() => {
    const map = {};
    for (const y of [cursor.y - 1, cursor.y, cursor.y + 1]) Object.assign(map, lowerSaxonyHolidays(y));
    Object.assign(map, extraClosed);
    return map;
  }, [cursor.y, extraClosed]);

  const openCreate = (dateIso) => setCreateForm(emptyForm(dateIso || ''));
  const submitCreate = async () => {
    // Only the Kürzel is mandatory — time (and everything else) stays optional.
    if (!createForm.handle.trim()) { toast('Bitte dein Kürzel angeben', { type: 'error' }); return; }
    setBusy(true);
    try {
      await api.post('/desktop/appointments', { ...createForm, department: dept });
      toast('Termin angelegt');
      setCreateForm(null);
      await load();
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };

  const load = async () => {
    setLoading(true);
    try { setRows(unwrap(await api.get('/desktop/appointments')).appointments || []); }
    catch (e) { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Pull the admin-managed closed days (holidays / special closures) once.
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/settings/holidays');
        const list = unwrap(res) || [];
        const map = {};
        (Array.isArray(list) ? list : list.holidays || []).forEach((h) => {
          if (h && h.date && h.isClosed !== false) map[String(h.date).slice(0, 10)] = h.name || 'Geschlossen';
        });
        setExtraClosed(map);
      } catch (e) { /* holidays are optional — computed ones still apply */ }
    })();
  }, []);

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
        {readOnly ? <span className="muted">nur ansehen</span> : <button className="btn" onClick={() => openCreate(todayIso)}>+ Termin</button>}
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
                const holidayName = holidays[k];               // set for holidays / closed days
                const closed = isClosedDay(dept, day) || !!holidayName;
                const full = limit && list.length >= limit;
                return (
                  <div key={k} className="cal-cell" style={{ opacity: inMonth ? 1 : 0.4, background: closed ? '#f8d7da55' : undefined, borderColor: k === todayIso ? 'var(--dept)' : undefined, cursor: 'pointer' }} onClick={() => setOpenDay(k)}>
                    <div className="cal-daynum">
                      <span>{day.getDate()}</span>
                      {closed ? <span className="badge" style={{ background: '#f8d7da', color: '#a52834', fontSize: 11 }}>0 · zu</span>
                             : limit ? <span className="badge" style={{ background: full ? '#f8d7da' : '#d3f2df', color: full ? '#a52834' : '#1f7a45', fontSize: 11 }}>{list.length}/{limit}{full ? ' voll' : ''}</span>
                             : (list.length ? <span className="badge open" style={{ fontSize: 11 }}>{list.length}</span> : null)}
                    </div>
                    {holidayName ? <div className="muted" style={{ fontSize: 10, color: '#a52834', padding: '0 4px' }}>{holidayName}</div> : null}
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
            {holidays[openDay] ? (
              <div className="badge" style={{ background: '#f8d7da', color: '#a52834', marginBottom: 8 }}>Geschlossen – {holidays[openDay]}</div>
            ) : isClosedDay(dept, new Date(openDay)) ? (
              <div className="badge" style={{ background: '#f8d7da', color: '#a52834', marginBottom: 8 }}>Geschlossen – an diesem Wochentag keine Termine</div>
            ) : null}
            {(byDay[openDay] || []).length === 0 ? (
              <div className="muted" style={{ padding: 12 }}>Keine Termine an diesem Tag.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                {(byDay[openDay] || []).slice().sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || ''))).map((a) => (
                  <div key={a.id} className="card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {readOnly ? (
                      <span className="badge" style={{ minWidth: 60 }}>{a.startTime ? String(a.startTime).slice(0, 5) : '—'}</span>
                    ) : (
                      <>
                        <input className="input" type="time" style={{ width: 110 }}
                          value={times[a.id] !== undefined ? times[a.id] : (a.startTime ? String(a.startTime).slice(0, 5) : '')}
                          onChange={(e) => setTimes((t) => ({ ...t, [a.id]: e.target.value }))} />
                        <button className="btn sm" onClick={() => saveTime(a)}>Uhrzeit speichern</button>
                      </>
                    )}
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <strong>{a.customerName || a.title || 'Termin'}</strong>
                      {a.customerNumber ? <span className="muted"> · Kd {a.customerNumber}</span> : null}
                      <div className="muted" style={{ fontSize: 12 }}>{a.title || ''}{a.phone ? ` · ☎ ${a.phone}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              {readOnly ? <span /> : <button className="btn" onClick={() => { const d = openDay; setOpenDay(null); openCreate(d); }}>+ Neuer Termin</button>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
                <button className="btn ghost" onClick={() => setOpenDay(null)}>Schließen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create a new appointment right from the calendar — same fields as Termine. */}
      {createForm && (
        <div className="backdrop" onClick={() => setCreateForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Neuer Termin</h2>
            <div className="form-grid">
              <label className="field">Kürzel *
                <input className="input" value={createForm.handle} onChange={(e) => setCreateForm({ ...createForm, handle: e.target.value })} autoFocus />
              </label>
              <label className="field">Art
                <select className="input" value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </label>
              <label className="field">Datum
                <input className="input" type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} />
              </label>
              <label className="field">Uhrzeit (optional)
                <input className="input" type="time" value={createForm.startTime} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })} />
              </label>
              <label className="field">Kunde
                <input className="input" value={createForm.customerName} onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })} />
              </label>
              <label className="field">Kundennummer
                <input className="input" value={createForm.customerNumber} onChange={(e) => setCreateForm({ ...createForm, customerNumber: e.target.value })} />
              </label>
              <label className="field">Telefon
                <input className="input" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
              </label>
              <label className="field full">Titel / Notiz
                <input className="input" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setCreateForm(null)}>Abbrechen</button>
              <button className="btn" onClick={submitCreate} disabled={busy || !createForm.handle.trim()}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
