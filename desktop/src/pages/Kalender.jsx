import React, { useEffect, useMemo, useState } from 'react';
import { backdropHandlers } from '../backdrop.js';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';
import { TYPES } from './Termine.jsx';
import { KUERZEL_COLOR, URLAUB_COLOR, FALLBACK_COLOR, apptColor, contrastText, LEGEND_BY_DEPT, kuerzelName } from '../apptColors.js';

// Calendar of appointments.
//  • Fahrrad (Service): month view Mo–Do (Fr/Sa/So removed), max 6/day, and you
//    can assign a repair number + Kürzel per appointment by opening a day.
//  • Robby / Kärcher: week view by default (Mo–Fr), colour-coded time blocks
//    like Google Calendar, switchable to a month view.
const DEPTS = [
  { key: 'fahrrad', label: 'Fahrrad' }, { key: 'reinigung', label: 'Kärcher' },
  { key: 'rasenmaeher', label: 'Rasenmäher' }, { key: 'service', label: 'Service' },
  { key: 'robby', label: 'Robby' }, { key: 'motorgeraete', label: 'Motorgeräte' },
  { key: 'elektro', label: 'Elektrofahrzeuge' }, { key: 'verkauf', label: 'Verkauf' },
  { key: 'lieferungen', label: 'Lieferungen' }, { key: 'lager', label: 'Lager' },
  { key: 'neurad', label: 'Neuradwerkstatt' },
];
const CONFIG = {
  service_manager: { dept: 'fahrrad', pick: true },
  bike_manager: { dept: 'fahrrad', readOnly: true },
  robby_manager: { dept: 'robby' },
  cleaning_manager: { dept: 'reinigung' },
  warehouse_worker: { dept: 'lager' },   // staff vacation/appointment calendar
  ev_manager: { dept: 'neurad' },        // Neuradwerkstatt staff calendar
  admin: { dept: 'fahrrad', pick: true },
  super_admin: { dept: 'fahrrad', pick: true },
};
// Colour-by-Kürzel calendars (week/month + type colours). Others are the plain
// month calendar.
const COLOR_CALS = new Set(['robby', 'reinigung', 'lager', 'neurad']);
// Fahrrad caps at 6/day and is closed Fri/Sat/Sun.
const DEPT_RULES = { fahrrad: { limit: 6, closed: [5, 6, 0] } };
const isClosedDay = (dept, day) => (DEPT_RULES[dept]?.closed || []).includes(day.getDay());

const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.key, t.label]));
const typeLabel = (t) => TYPE_LABEL[t] || t || 'Termin';
// Staff calendars only distinguish Termin vs Urlaub.
const STAFF_TYPES = [{ key: 'other', label: 'Termin' }, { key: 'urlaub', label: 'Urlaub' }];

const savedHandle = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('wp_handle') || '' : '');
const emptyForm = (date = '') => ({ title: '', type: 'repair', date, startTime: '', endTime: '', customerName: '', customerNumber: '', phone: '', description: '', handle: savedHandle(), assignedHandle: '' });
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = (date) => { const d = new Date(date); const off = (d.getDay() + 6) % 7; return addDays(d, -off); };
const hm = (t) => (t ? String(t).slice(0, 5) : '');
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3);
  const ft = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - ft) / 86400000 - 3 + ((ft.getUTCDay() + 6) % 7)) / 7);
}

// Easter Sunday → anchor for the moving holidays.
function easterSunday(Y) {
  const a = Y % 19, b = Math.floor(Y / 100), c = Y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Y, month - 1, day);
}
function lowerSaxonyHolidays(Y) {
  const es = easterSunday(Y);
  return {
    [iso(new Date(Y, 0, 1))]: 'Neujahr', [iso(addDays(es, -2))]: 'Karfreitag', [iso(addDays(es, 1))]: 'Ostermontag',
    [iso(new Date(Y, 4, 1))]: 'Tag der Arbeit', [iso(addDays(es, 39))]: 'Christi Himmelfahrt', [iso(addDays(es, 50))]: 'Pfingstmontag',
    [iso(new Date(Y, 9, 3))]: 'Tag der Deutschen Einheit', [iso(new Date(Y, 9, 31))]: 'Reformationstag',
    [iso(new Date(Y, 11, 25))]: '1. Weihnachtstag', [iso(new Date(Y, 11, 26))]: '2. Weihnachtstag',
  };
}

// Print arbitrary HTML via a hidden iframe (works in the .exe, no popup).
function printHTML(title, inner) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#1a2330;margin:24px;}
    h1{font-size:18px;} table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px;}
    th{background:#22516f;color:#fff;text-align:left;padding:6px 9px;} td{border:1px solid #d6dde5;padding:5px 9px;}
  </style></head><body>${inner}</body></html>`;
  const f = document.createElement('iframe');
  f.style.position = 'fixed'; f.style.right = '0'; f.style.bottom = '0'; f.style.width = '0'; f.style.height = '0'; f.style.border = '0';
  document.body.appendChild(f);
  const doc = f.contentWindow.document; doc.open(); doc.write(html); doc.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => document.body.removeChild(f), 1000); }, 250);
}

const HOUR0 = 7, HOUR1 = 20, PXH = 44; // week grid 07–20 Uhr

// Lay overlapping events into side-by-side columns so nothing overlaps.
// Each event needs _s/_e (start/end minutes); adds _col + _cols.
function layoutColumns(evs) {
  const sorted = [...evs].sort((a, b) => a._s - b._s || a._e - b._e);
  let cluster = [], clusterEnd = -1; const out = [];
  const flush = () => {
    const colEnds = [];
    for (const ev of cluster) {
      let c = 0; for (; c < colEnds.length; c++) if (colEnds[c] <= ev._s) break;
      ev._col = c; colEnds[c] = ev._e;
    }
    for (const ev of cluster) { ev._cols = colEnds.length; out.push(ev); }
    cluster = []; clusterEnd = -1;
  };
  for (const ev of sorted) {
    if (cluster.length && ev._s >= clusterEnd) flush();
    cluster.push(ev); clusterEnd = Math.max(clusterEnd, ev._e);
  }
  if (cluster.length) flush();
  return out;
}

export default function Kalender({ user }) {
  const toast = useToast();
  const cfg = CONFIG[user.role] || { dept: 'fahrrad', pick: true };
  const [dept, setDept] = useState(cfg.dept);
  const readOnly = !!cfg.readOnly;
  const isFahrrad = dept === 'fahrrad';
  const isColorCal = COLOR_CALS.has(dept);
  // Staff calendars (Lager/Neurad): reason is just Urlaub/Termin and Urlaub is
  // NOT red — everything is coloured by the person's Kürzel.
  const isStaffCal = dept === 'lager' || dept === 'neurad';
  const ac = (a) => apptColor(a, !isStaffCal);
  // Label shown as the "Grund" for a block.
  const grund = (a) => (a.type === 'urlaub' ? 'Urlaub' : (isStaffCal ? 'Termin' : typeLabel(a.type)));
  // Main one-line label for a block.
  const mainLabel = (a) => {
    if (isStaffCal) return `${a.handle ? `[${a.handle}] ` : ''}${grund(a)}${a.title ? ` · ${a.title}` : ''}`;
    if (a.type === 'urlaub') return `${a.handle ? `[${a.handle}] ` : ''}Urlaub`;
    return `${isColorCal && a.handle ? `[${a.handle}] ` : ''}${a.customerName || a.title || '—'}`;
  };
  const limit = DEPT_RULES[dept]?.limit || null;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [view, setView] = useState('week'); // used for robby/kärcher: week | month
  const [openDay, setOpenDay] = useState(null);
  const [createForm, setCreateForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [times, setTimes] = useState({});
  const [edits, setEdits] = useState({});   // per-appt repairNumber/assignedHandle edits
  const [extraClosed, setExtraClosed] = useState({});

  const holidays = useMemo(() => {
    const map = {};
    for (const y of [cursor.y - 1, cursor.y, cursor.y + 1, weekStart.getFullYear()]) Object.assign(map, lowerSaxonyHolidays(y));
    Object.assign(map, extraClosed);
    return map;
  }, [cursor.y, weekStart, extraClosed]);

  const load = async () => {
    setLoading(true);
    try { setRows(unwrap(await api.get('/desktop/appointments')).appointments || []); }
    catch (e) { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    (async () => {
      try {
        const list = unwrap(await api.get('/settings/holidays')) || [];
        const map = {};
        (Array.isArray(list) ? list : list.holidays || []).forEach((h) => { if (h && h.date && h.isClosed !== false) map[String(h.date).slice(0, 10)] = h.name || 'Geschlossen'; });
        setExtraClosed(map);
      } catch (e) { /* optional */ }
    })();
  }, []);

  const byDay = useMemo(() => {
    const map = {};
    rows.filter((a) => (a.department || '') === dept && a.date && a.status !== 'cancelled').forEach((a) => {
      const k = String(a.date).slice(0, 10);
      (map[k] = map[k] || []).push(a);
    });
    return map;
  }, [rows, dept]);

  const openCreate = (dateIso, startTime = '') => setCreateForm({ ...emptyForm(dateIso || ''), startTime, type: isStaffCal ? 'other' : 'repair' });
  const openEdit = (a) => setCreateForm({
    _id: a.id, title: a.title || '', type: a.type || 'repair', date: String(a.date || '').slice(0, 10),
    startTime: hm(a.startTime), endTime: hm(a.endTime), customerName: a.customerName || '',
    customerNumber: a.customerNumber || '', phone: a.phone || '', handle: a.handle || savedHandle(),
    assignedHandle: a.assignedHandle || '', repairNumber: a.repairNumber || '',
  });
  const submitCreate = async () => {
    if (!createForm.handle.trim()) { toast('Bitte dein Kürzel angeben', { type: 'error' }); return; }
    setBusy(true);
    try {
      if (createForm._id) { await api.patch(`/desktop/appointments/${createForm._id}`, createForm); toast('Termin gespeichert'); }
      else { await api.post('/desktop/appointments', { ...createForm, department: dept }); toast('Termin angelegt'); }
      setCreateForm(null); await load();
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const saveTime = async (a) => {
    const t = times[a.id] !== undefined ? times[a.id] : hm(a.startTime);
    try { await api.patch(`/desktop/appointments/${a.id}`, { startTime: t || null }); toast('Uhrzeit gespeichert'); await load(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };
  const saveAssign = async (a) => {
    const e = edits[a.id] || {};
    const body = { repairNumber: e.repairNumber !== undefined ? e.repairNumber : (a.repairNumber || ''), assignedHandle: e.assignedHandle !== undefined ? e.assignedHandle : (a.assignedHandle || '') };
    try { await api.patch(`/desktop/appointments/${a.id}`, body); toast('Zugeteilt'); await load(); }
    catch (e2) { toast(e2.message, { type: 'error' }); }
  };
  const cancelAppt = async (a) => {
    if (!confirm('Termin absagen?')) return;
    try { await api.patch(`/desktop/appointments/${a.id}`, { status: 'cancelled' }); await load(); toast('Abgesagt'); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  const printDay = (k) => {
    const list = (byDay[k] || []).slice().sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
    const rep = isFahrrad;
    const head = `<tr><th>Uhrzeit</th>${rep ? '<th>Rep-Nr.</th><th>Kürzel</th>' : ''}<th>Kunde</th><th>Art / Notiz</th></tr>`;
    const rowsHtml = list.map((a) => `<tr><td>${hm(a.startTime) || '—'}</td>${rep ? `<td>${a.repairNumber || ''}</td><td>${a.assignedHandle || ''}</td>` : ''}<td>${a.customerName || ''}${a.customerNumber ? ` (Kd ${a.customerNumber})` : ''}</td><td>${typeLabel(a.type)}${a.title ? ` · ${a.title}` : ''}</td></tr>`).join('');
    printHTML(`Tagesplan ${k}`, `<h1>Tagesplan · ${k.split('-').reverse().join('.')} · ${DEPTS.find((d) => d.key === dept)?.label || dept}</h1>
      <table><thead>${head}</thead><tbody>${rowsHtml || `<tr><td colspan=${rep ? 5 : 3}>Keine Termine</td></tr>`}</tbody></table>`);
  };

  const move = (delta) => setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const moveWeek = (delta) => setWeekStart((w) => addDays(w, delta * 7));
  const todayIso = iso(new Date());
  const showWeek = isColorCal && view === 'week';

  // Visible weekday count: Fahrrad Mo–Do, Robby/Kärcher Mo–Fr, else Mo–So.
  const visN = isFahrrad ? 4 : (isColorCal ? 5 : 7);

  // Month grid (Mon-first).
  const weeks = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startOff = (first.getDay() + 6) % 7;
    const start = new Date(cursor.y, cursor.m, 1 - startOff);
    const out = [];
    for (let w = 0; w < 6; w++) { const row = []; for (let d = 0; d < 7; d++) { const day = new Date(start); day.setDate(start.getDate() + w * 7 + d); row.push(day); } out.push(row.slice(0, visN)); }
    return out;
  }, [cursor, visN]);

  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <div>
      <div className="toolbar no-print">
        {showWeek ? (
          <>
            <button className="btn ghost" onClick={() => moveWeek(-1)}>← Woche</button>
            <strong style={{ minWidth: 200, textAlign: 'center' }}>KW {isoWeek(weekStart)} · {pad(weekStart.getDate())}.{pad(weekStart.getMonth() + 1)}. – {pad(addDays(weekStart, 4).getDate())}.{pad(addDays(weekStart, 4).getMonth() + 1)}.{weekStart.getFullYear()}</strong>
            <button className="btn ghost" onClick={() => moveWeek(1)}>Woche →</button>
          </>
        ) : (
          <>
            <button className="btn ghost" onClick={() => move(-1)}>← Vorheriger</button>
            <strong style={{ minWidth: 160, textAlign: 'center' }}>{MONTHS[cursor.m]} {cursor.y}</strong>
            <button className="btn ghost" onClick={() => move(1)}>Nächster →</button>
          </>
        )}
        <div className="spacer" />
        {isColorCal && (
          <div className="tabs" style={{ display: 'inline-flex', gap: 4 }}>
            <span className={`pill tab ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Woche</span>
            <span className={`pill tab ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Monat</span>
          </div>
        )}
        {cfg.pick && (
          <select className="select" value={dept} onChange={(e) => setDept(e.target.value)}>
            {DEPTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        )}
        {limit ? <span className="muted">max. {limit}/Tag</span> : null}
        {readOnly ? <span className="muted">nur ansehen</span> : <button className="btn" onClick={() => openCreate(showWeek ? iso(weekStart) : todayIso)}>+ Termin</button>}
      </div>

      {isColorCal && (LEGEND_BY_DEPT[dept] || []).length > 0 && (
        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', margin: '0 0 8px', fontSize: 12 }}>
          {(LEGEND_BY_DEPT[dept] || []).map((k) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: KUERZEL_COLOR[k] }} /> {k}{kuerzelName(k) ? ` · ${kuerzelName(k)}` : ''}
            </span>
          ))}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: URLAUB_COLOR }} /> Urlaub</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: FALLBACK_COLOR }} /> andere</span>
        </div>
      )}

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        : showWeek ? (
          /* ── Week view (Google-style colour blocks) ── */
          <div style={{ border: '1px solid var(--dept-soft)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(5, 1fr)` }}>
              <div />
              {weekDays.map((d) => {
                const hn = holidays[iso(d)];
                return <div key={iso(d)} onClick={() => setOpenDay(iso(d))} title="Tagesübersicht öffnen" style={{ textAlign: 'center', padding: '6px 2px', fontWeight: 700, cursor: 'pointer', background: iso(d) === todayIso ? 'var(--dept-soft)' : (hn ? '#f8d7da' : 'transparent'), color: hn ? '#a52834' : undefined }}>
                  {WD[(d.getDay() + 6) % 7]} {pad(d.getDate())}.{pad(d.getMonth() + 1)}.{hn ? <div style={{ fontSize: 10 }}>{hn}</div> : null}
                </div>;
              })}
            </div>
            {/* all-day (no time) */}
            <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(5, 1fr)`, borderTop: '1px solid var(--dept-soft)', minHeight: 26 }}>
              <div style={{ fontSize: 10, color: '#8a94a6', padding: 4 }}>Ohne feste<br />Uhrzeit</div>
              {weekDays.map((d) => {
                const list = (byDay[iso(d)] || []).filter((a) => !a.startTime);
                return <div key={iso(d)} style={{ borderLeft: '1px solid var(--dept-soft)', padding: 2 }}>
                  {list.map((a) => <div key={a.id} onClick={(ev) => { ev.stopPropagation(); readOnly ? setOpenDay(iso(d)) : openEdit(a); }} title={`${a.handle ? `[${a.handle}] ` : ''}${typeLabel(a.type)} – ${a.customerName || ''}`} style={{ background: ac(a), color: contrastText(ac(a)), borderRadius: 4, padding: '1px 5px', margin: '2px 0', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mainLabel(a)}{!isStaffCal && a.type !== 'urlaub' ? ` · ${typeLabel(a.type)}` : ''}</div>)}
                </div>;
              })}
            </div>
            {/* timed grid */}
            <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(5, 1fr)`, position: 'relative' }}>
              <div>
                {Array.from({ length: HOUR1 - HOUR0 }, (_, i) => (
                  <div key={i} style={{ height: PXH, fontSize: 10, color: '#8a94a6', textAlign: 'right', paddingRight: 4, boxSizing: 'border-box' }}>{HOUR0 + i}:00</div>
                ))}
              </div>
              {weekDays.map((d) => {
                const k = iso(d);
                // Compute start/end minutes, then lay overlapping events side-by-side.
                const timed = layoutColumns((byDay[k] || []).filter((a) => a.startTime).map((a) => {
                  const [H, M] = hm(a.startTime).split(':').map(Number);
                  const s = H * 60 + M;
                  const eh = hm(a.endTime); let e = s + 60; // no end → 1 hour
                  if (eh) { const [EH, EM] = eh.split(':').map(Number); e = Math.max(s + 20, EH * 60 + EM); }
                  return { a, _s: s, _e: e };
                }));
                return (
                  <div key={k} style={{ position: 'relative', borderLeft: '1px solid var(--dept-soft)', height: (HOUR1 - HOUR0) * PXH, cursor: readOnly ? 'default' : 'pointer' }}
                    onClick={(e) => { if (readOnly) return; const rect = e.currentTarget.getBoundingClientRect(); const mins = Math.round(((e.clientY - rect.top) / PXH * 60 + HOUR0 * 60) / 15) * 15; openCreate(k, `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`); }}>
                    {Array.from({ length: HOUR1 - HOUR0 }, (_, i) => <div key={i} style={{ position: 'absolute', top: i * PXH, left: 0, right: 0, borderTop: '1px solid #eef0f3', height: 0 }} />)}
                    {timed.map(({ a, _s, _e, _col, _cols }) => {
                      const top = Math.max(0, (_s - HOUR0 * 60) / 60 * PXH);
                      const height = Math.max(22, (_e - _s) / 60 * PXH);
                      const widthPct = 100 / _cols;
                      return (
                        <div key={a.id} onClick={(ev) => { ev.stopPropagation(); readOnly ? setOpenDay(k) : openEdit(a); }} title={`${hm(a.startTime)} ${a.handle ? `[${a.handle}] ` : ''}${typeLabel(a.type)} – ${a.customerName || ''}`}
                          style={{ position: 'absolute', top, left: `calc(${_col * widthPct}% + 1px)`, width: `calc(${widthPct}% - 2px)`, height, background: ac(a), color: contrastText(ac(a)), borderRadius: 5, padding: '2px 4px', fontSize: 11, lineHeight: 1.15, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,.2)', cursor: 'pointer', boxSizing: 'border-box' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><b>{hm(a.startTime)}</b> {mainLabel(a)}</div>
                          {!isStaffCal && a.type !== 'urlaub' && height > 30 ? <div style={{ fontSize: 10, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{typeLabel(a.type)}</div> : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Month view ── */
          <div className="cal">
            <div className="cal-head" style={{ gridTemplateColumns: `repeat(${visN}, 1fr)` }}>{WD.slice(0, visN).map((d) => <div key={d} className="cal-wd">{d}</div>)}</div>
            {weeks.map((week, wi) => (
              <div key={wi} className="cal-row" style={{ gridTemplateColumns: `repeat(${visN}, 1fr)` }}>
                {week.map((day) => {
                  const k = iso(day);
                  const list = byDay[k] || [];
                  const inMonth = day.getMonth() === cursor.m;
                  const holidayName = holidays[k];
                  const closed = isClosedDay(dept, day) || !!holidayName;
                  const full = limit && list.length >= limit;
                  return (
                    <div key={k} className="cal-cell" style={{ minHeight: isFahrrad ? 130 : 108, opacity: inMonth ? 1 : 0.4, background: closed ? '#f8d7da55' : undefined, borderColor: k === todayIso ? 'var(--dept)' : undefined, cursor: 'pointer' }} onClick={() => setOpenDay(k)}>
                      <div className="cal-daynum">
                        <span>{day.getDate()}</span>
                        {closed ? <span className="badge" style={{ background: '#f8d7da', color: '#a52834', fontSize: 11 }}>0 · zu</span>
                          : limit ? <span className="badge" style={{ background: full ? '#f8d7da' : '#d3f2df', color: full ? '#a52834' : '#1f7a45', fontSize: 11 }}>{list.length}/{limit}{full ? ' voll' : ''}</span>
                            : (list.length ? <span className="badge open" style={{ fontSize: 11 }}>{list.length}</span> : null)}
                      </div>
                      {holidayName ? <div className="muted" style={{ fontSize: 10, color: '#a52834', padding: '0 4px' }}>{holidayName}</div> : null}
                      <div className="cal-items">
                        {list.slice(0, 7).map((a) => (
                          <div key={a.id} title={`${a.handle ? `[${a.handle}] ` : ''}${typeLabel(a.type)} ${a.customerName || ''}`}
                            onClick={isColorCal && !readOnly ? (ev) => { ev.stopPropagation(); openEdit(a); } : undefined}
                            style={isColorCal
                              ? { background: ac(a), color: contrastText(ac(a)), borderRadius: 4, padding: '1px 5px', margin: '2px 0', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: readOnly ? 'pointer' : 'pointer' }
                              : { fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {a.startTime ? <b>{hm(a.startTime)} </b> : null}{isColorCal ? mainLabel(a) : (a.customerName || a.title || typeLabel(a.type))}{!isStaffCal && isColorCal && a.type !== 'urlaub' ? ` · ${typeLabel(a.type)}` : ''}{!isColorCal && a.assignedHandle ? ` [${a.assignedHandle}]` : ''}
                          </div>
                        ))}
                        {list.length > 7 ? <div className="muted" style={{ fontSize: 11 }}>+{list.length - 7} mehr</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

      {/* Day modal: list appointments, edit time, assign repair-nr + Kürzel (Fahrrad), print */}
      {openDay && (
        <div className="backdrop" {...backdropHandlers(() => setOpenDay(null))}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 720 }}>
            <h2>{openDay.split('-').reverse().join('.')}{limit ? ` · ${(byDay[openDay] || []).length}/${limit}` : ''}</h2>
            {holidays[openDay] ? <div className="badge" style={{ background: '#f8d7da', color: '#a52834', marginBottom: 8 }}>Geschlossen – {holidays[openDay]}</div>
              : isClosedDay(dept, new Date(openDay)) ? <div className="badge" style={{ background: '#f8d7da', color: '#a52834', marginBottom: 8 }}>Geschlossen – an diesem Wochentag keine Termine</div> : null}
            {(byDay[openDay] || []).length === 0 ? <div className="muted" style={{ padding: 12 }}>Keine Termine an diesem Tag.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 440, overflowY: 'auto' }}>
                {(byDay[openDay] || []).slice().sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || ''))).map((a) => {
                  const e = edits[a.id] || {};
                  return (
                    <div key={a.id} className="card" style={{ padding: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 5, background: ac(a) }} />
                        {readOnly ? <span className="badge" style={{ minWidth: 54 }}>{hm(a.startTime) || '—'}</span> : (
                          <>
                            <input className="input" type="time" style={{ width: 104 }} value={times[a.id] !== undefined ? times[a.id] : hm(a.startTime)} onChange={(ev) => setTimes((t) => ({ ...t, [a.id]: ev.target.value }))} />
                            <button className="btn sm" onClick={() => saveTime(a)}>Zeit</button>
                          </>
                        )}
                        <div style={{ flex: 1, minWidth: 150 }}>
                          <strong>{a.customerName || a.title || typeLabel(a.type)}</strong>
                          {a.customerNumber ? <span className="muted"> · Kd {a.customerNumber}</span> : null}
                          {a.workDone ? <span className="badge" style={{ background: '#d3f2df', color: '#1f7a45', marginLeft: 6 }}>✓ erledigt</span> : null}
                          <div className="muted" style={{ fontSize: 12 }}>{grund(a)}{a.title ? ` · ${a.title}` : ''}{a.repairNumber ? ` · Rep ${a.repairNumber}` : ''}{a.phone ? ` · ☎ ${a.phone}` : ''}</div>
                          {a.warnNote ? <div style={{ color: '#c53030', fontWeight: 700, fontSize: 12 }}>⚠ {a.warnNote}</div> : null}
                        </div>
                        {!readOnly ? <button className="btn sm ghost" onClick={() => { setOpenDay(null); openEdit(a); }} title="Bearbeiten">✏️</button> : null}
                        {!readOnly ? <button className="btn sm ghost" onClick={() => cancelAppt(a)} title="Absagen">🚫</button> : null}
                      </div>
                      {!readOnly && isFahrrad && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <label className="field" style={{ margin: 0 }}>Rep-Nr.
                            <input className="input" style={{ width: 150 }} value={e.repairNumber !== undefined ? e.repairNumber : (a.repairNumber || '')} onChange={(ev) => setEdits((x) => ({ ...x, [a.id]: { ...x[a.id], repairNumber: ev.target.value } }))} />
                          </label>
                          <label className="field" style={{ margin: 0 }}>Kürzel Reparaturzuteilung
                            <input className="input" style={{ width: 130 }} value={e.assignedHandle !== undefined ? e.assignedHandle : (a.assignedHandle || '')} onChange={(ev) => setEdits((x) => ({ ...x, [a.id]: { ...x[a.id], assignedHandle: ev.target.value } }))} />
                          </label>
                          <button className="btn sm" onClick={() => saveAssign(a)}>Zuteilen</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              {readOnly ? <span /> : <button className="btn" onClick={() => { const d = openDay; setOpenDay(null); openCreate(d); }}>+ Neuer Termin</button>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost" onClick={() => printDay(openDay)}>🖨️ Tagesplan drucken</button>
                <button className="btn ghost" onClick={() => setOpenDay(null)}>Schließen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create appointment */}
      {createForm && (
        <div className="backdrop" {...backdropHandlers(() => setCreateForm(null))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{createForm._id ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
            <div className="form-grid">
              <label className="field">{isFahrrad ? 'Kürzel Terminannahme *' : 'Kürzel *'}
                <input className="input" value={createForm.handle} onChange={(e) => setCreateForm({ ...createForm, handle: e.target.value })} autoFocus />
              </label>
              {isFahrrad && (
                <label className="field">Kürzel Reparaturzuteilung
                  <input className="input" value={createForm.assignedHandle || ''} onChange={(e) => setCreateForm({ ...createForm, assignedHandle: e.target.value })} />
                </label>
              )}
              {isFahrrad && (
                <label className="field">Rep-Nr.
                  <input className="input" value={createForm.repairNumber || ''} onChange={(e) => setCreateForm({ ...createForm, repairNumber: e.target.value })} />
                </label>
              )}
              <label className="field">{isStaffCal ? 'Grund' : 'Art'}
                <select className="input" value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}>
                  {(isStaffCal ? STAFF_TYPES : TYPES).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </label>
              <label className="field">Datum
                <input className="input" type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} />
              </label>
              <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row', paddingTop: 22 }}>
                <input type="checkbox" checked={!createForm.startTime && !createForm.endTime && createForm._allDay !== false} onChange={(e) => setCreateForm({ ...createForm, _allDay: e.target.checked, ...(e.target.checked ? { startTime: '', endTime: '' } : {}) })} />
                Ganzer Tag
              </label>
              <label className="field">Uhrzeit (optional)
                <input className="input" type="time" value={createForm.startTime} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value, _allDay: false })} />
              </label>
              <label className="field">Bis (optional)
                <input className="input" type="time" value={createForm.endTime} onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value, _allDay: false })} />
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
