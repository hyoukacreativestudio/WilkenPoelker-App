import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';

// ── date helpers ──────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const deDate = (s) => { const d = parseISO(s); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; };
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const wd = (d) => WD[d.getDay()];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtH = (h) => (h ? `${(Math.round(h * 100) / 100).toString().replace('.', ',')} h` : '–');

// ISO week number + its year.
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return { week, year: d.getUTCFullYear() };
}
function mondayOf(date) { const d = new Date(date); const off = (d.getDay() + 6) % 7; return addDays(d, -off); }

export default function HiddenTools({ user, onClose }) {
  const toast = useToast();
  const [tab, setTab] = useState('stempel');
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    (async () => {
      try { const d = unwrap(await api.get('/desktop/hidden/employees')); setEmployees(d.employees || []); setDepartments(d.departments || []); }
      catch (e) { /* ignore */ }
    })();
  }, []);

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(960px, 96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>🛠️ Interne Tools</h2>
          <span className="badge" style={{ background: '#eef', color: '#448' }}>nur Admin</span>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>Schließen ✕</button>
        </div>
        <div className="toolbar no-print" style={{ marginBottom: 10 }}>
          {[['stempel', '⏱️ Stempeluhr'], ['anfragen', '📝 Urlaubsanfragen'], ['kalender', '📅 Urlaubskalender']].map(([k, l]) => (
            <span key={k} className={`pill tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</span>
          ))}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {tab === 'stempel' && <Stempeluhr />}
          {tab === 'anfragen' && <Urlaubsanfragen employees={employees} onChanged={() => {}} />}
          {tab === 'kalender' && <Urlaubskalender departments={departments} />}
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: Stempeluhr + Auswertung ─────────────────────────────────────────
function Stempeluhr() {
  const toast = useToast();
  const [name, setName] = useState(() => localStorage.getItem('wp_stempel_name') || '');
  const [activity, setActivity] = useState(() => localStorage.getItem('wp_stempel_activity') || 'App-Entwicklung');
  const [running, setRunning] = useState(false);
  const [openEntry, setOpenEntry] = useState(null);
  const [now, setNow] = useState(Date.now());
  const today = new Date();
  const [from, setFrom] = useState(iso(addDays(mondayOf(today), -21)));
  const [to, setTo] = useState(iso(today));
  const [entries, setEntries] = useState([]);
  const [vacations, setVacations] = useState([]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const loadStatus = async (nm) => {
    if (!nm) return;
    try { const d = unwrap(await api.get(`/desktop/hidden/timeclock/status?name=${encodeURIComponent(nm)}`)); setRunning(d.running); setOpenEntry(d.entry || null); }
    catch (e) { /* ignore */ }
  };
  const loadReport = async () => {
    if (!name) return;
    try {
      const d = unwrap(await api.get(`/desktop/hidden/timeclock?name=${encodeURIComponent(name)}&from=${from}&to=${to}`));
      setEntries(d.entries || []);
      const v = unwrap(await api.get(`/desktop/hidden/vacations?status=approved&from=${from}&to=${to}`));
      setVacations((v.entries || []).filter((e) => e.personName === name));
    } catch (e) { setEntries([]); }
  };
  useEffect(() => { loadStatus(name); }, []);
  useEffect(() => { if (name) loadReport(); /* eslint-disable-next-line */ }, [name, from, to]);

  const punch = async () => {
    if (!name.trim()) { toast('Bitte zuerst deinen Namen eingeben', { type: 'error' }); return; }
    localStorage.setItem('wp_stempel_name', name.trim());
    localStorage.setItem('wp_stempel_activity', activity.trim() || 'App-Entwicklung');
    try {
      const d = unwrap(await api.post('/desktop/hidden/timeclock/punch', { name: name.trim(), activity: activity.trim() }));
      setRunning(d.running); setOpenEntry(d.entry || null);
      toast(d.running ? 'Eingestempelt' : 'Ausgestempelt');
      loadReport();
    } catch (e) { toast(e.message, { type: 'error' }); }
  };

  const elapsed = openEntry && running ? Math.max(0, now - new Date(openEntry.clockIn).getTime()) : 0;
  const elapsedStr = `${pad(Math.floor(elapsed / 3600000))}:${pad(Math.floor(elapsed / 60000) % 60)}:${pad(Math.floor(elapsed / 1000) % 60)}`;

  // Build the report grouped by ISO week.
  const report = useMemo(() => buildReport(entries, vacations, from, to), [entries, vacations, from, to]);

  return (
    <div>
      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div className="form-grid">
          <label className="field">Name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" />
          </label>
          <label className="field">Tätigkeit
            <input className="input" value={activity} onChange={(e) => setActivity(e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
          <button className="btn" style={{ background: running ? '#E53E3E' : undefined, fontSize: 16, padding: '10px 20px' }} onClick={punch}>
            {running ? '■ Ausstempeln' : '▶ Einstempeln'}
          </button>
          {running ? <span style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{elapsedStr}</span>
                   : <span className="muted">nicht eingestempelt</span>}
        </div>
      </div>

      <div className="toolbar no-print" style={{ marginBottom: 8 }}>
        <strong>Auswertung</strong>
        <div className="spacer" />
        <label className="muted">von <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} /></label>
        <label className="muted">bis <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} /></label>
        <button className="btn" onClick={() => printReport(name, report)} disabled={!name}>🖨️ Als PDF</button>
      </div>

      {report.length === 0 ? <div className="empty"><div className="big">⏱️</div>Keine Zeiten im Zeitraum.</div>
        : report.map((w) => (
          <div key={`${w.year}-${w.week}`} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, color: 'var(--dept)', marginBottom: 6 }}>KW {w.week} · {deDate(w.start).slice(0, 6)} – {deDate(w.end)}</div>
            <div className="table-wrap"><table>
              <thead><tr><th>Datum</th><th>Tag</th><th>Tätigkeit</th><th className="right">Stunden</th></tr></thead>
              <tbody>
                {w.rows.map((r) => (
                  <tr key={r.date} style={r.vacation ? { color: '#8a94a6' } : undefined}>
                    <td>{deDate(r.date)}</td><td>{r.wd}</td>
                    <td>{r.vacation ? 'Urlaub' : (r.hours ? r.activity : '')}</td>
                    <td className="right">{r.vacation ? '–' : fmtH(r.hours)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700, background: 'var(--dept-soft)' }}>
                  <td></td><td></td><td>Summe KW {w.week}</td><td className="right">{fmtH(w.total)}</td>
                </tr>
              </tbody>
            </table></div>
          </div>
        ))}
    </div>
  );
}

// Aggregate punches per day, mark vacation days, group into ISO weeks.
function buildReport(entries, vacations, from, to) {
  const hoursByDay = {};
  for (const e of entries) {
    if (!e.clockIn || !e.clockOut) continue;
    const day = iso(new Date(e.clockIn));
    const h = (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 3600000;
    if (h > 0) hoursByDay[day] = (hoursByDay[day] || 0) + h;
  }
  const activityByDay = {};
  for (const e of entries) { if (e.clockIn) activityByDay[iso(new Date(e.clockIn))] = e.activity || 'App-Entwicklung'; }
  const vacDays = new Set();
  for (const v of vacations) { let d = parseISO(v.startDate); const end = parseISO(v.endDate); while (d <= end) { vacDays.add(iso(d)); d = addDays(d, 1); } }

  const weeks = new Map();
  let d = parseISO(from); const end = parseISO(to);
  while (d <= end) {
    const k = iso(d);
    const hasWork = hoursByDay[k] > 0;
    const isVac = vacDays.has(k);
    if (hasWork || isVac) {
      const { week, year } = isoWeek(d);
      const wk = `${year}-${pad(week)}`;
      if (!weeks.has(wk)) { const mon = mondayOf(d); weeks.set(wk, { week, year, start: iso(mon), end: iso(addDays(mon, 6)), rows: [], total: 0 }); }
      const w = weeks.get(wk);
      w.rows.push({ date: k, wd: wd(d), hours: hoursByDay[k] || 0, activity: activityByDay[k] || 'App-Entwicklung', vacation: isVac && !hasWork });
      if (hasWork) w.total += hoursByDay[k];
    }
    d = addDays(d, 1);
  }
  return [...weeks.values()];
}

// Open a clean print window (→ user saves as PDF), styled like the report.
function printReport(name, report) {
  const rows = report.map((w) => `
    <h3>KW ${w.week} · ${deDate(w.start).slice(0, 6)} – ${deDate(w.end)}</h3>
    <table>
      <thead><tr><th>Datum</th><th>Tag</th><th>Tätigkeit</th><th class="r">Stunden</th></tr></thead>
      <tbody>
        ${w.rows.map((r) => `<tr class="${r.vacation ? 'vac' : ''}"><td>${deDate(r.date)}</td><td>${r.wd}</td><td>${r.vacation ? 'Urlaub' : (r.hours ? r.activity : '')}</td><td class="r">${r.vacation ? '–' : fmtH(r.hours)}</td></tr>`).join('')}
        <tr class="sum"><td></td><td></td><td>Summe KW ${w.week}</td><td class="r">${fmtH(w.total)}</td></tr>
      </tbody>
    </table>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Zeiterfassung ${name}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#1a2330;margin:32px;}
      h1{font-size:20px;} h3{color:#22516f;margin:20px 0 6px;}
      table{border-collapse:collapse;width:100%;margin-bottom:6px;font-size:13px;}
      th{background:#22516f;color:#fff;text-align:left;padding:7px 10px;}
      td{border:1px solid #d6dde5;padding:6px 10px;}
      .r{text-align:right;} .sum td{background:#eef2f6;font-weight:700;}
      .vac td{color:#8a94a6;background:#f7f8fa;}
    </style></head><body>
    <h1>Zeiterfassung · ${name}</h1>${rows}
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html); w.document.close();
}

// ── Tab 2: Urlaubsanfragen (create + approve) ──────────────────────────────
function Urlaubsanfragen({ employees }) {
  const toast = useToast();
  const [personName, setPersonName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [pending, setPending] = useState([]);
  const [busy, setBusy] = useState(false);

  const dept = useMemo(() => employees.find((e) => e.name === personName)?.department || '', [employees, personName]);

  const loadPending = async () => {
    try { const d = unwrap(await api.get('/desktop/hidden/vacations?status=pending')); setPending(d.entries || []); }
    catch (e) { setPending([]); }
  };
  useEffect(() => { loadPending(); }, []);

  const submit = async () => {
    if (!personName) { toast('Bitte Mitarbeiter wählen', { type: 'error' }); return; }
    if (!start || !end) { toast('Bitte Zeitraum wählen', { type: 'error' }); return; }
    setBusy(true); setConflicts([]);
    try {
      const d = unwrap(await api.post('/desktop/hidden/vacations', { personName, department: dept, startDate: start, endDate: end, note }));
      setConflicts(d.conflicts || []);
      toast('Urlaubsanfrage erstellt');
      setNote('');
      loadPending();
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const approve = async (r) => { try { await api.post(`/desktop/hidden/vacations/${r.id}/approve`); toast('Bestätigt – im Kalender eingetragen'); loadPending(); } catch (e) { toast(e.message, { type: 'error' }); } };
  const reject = async (r) => { if (!confirm('Anfrage ablehnen?')) return; try { await api.del(`/desktop/hidden/vacations/${r.id}`); toast('Abgelehnt'); loadPending(); } catch (e) { toast(e.message, { type: 'error' }); } };

  return (
    <div>
      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <strong>Neue Urlaubsanfrage</strong>
        <div className="form-grid" style={{ marginTop: 8 }}>
          <label className="field">Mitarbeiter
            <select className="input" value={personName} onChange={(e) => setPersonName(e.target.value)}>
              <option value="">— wählen —</option>
              {employees.map((e) => <option key={e.name} value={e.name}>{e.name}</option>)}
            </select>
          </label>
          <label className="field">Abteilung
            <input className="input" value={dept} readOnly placeholder="—" />
          </label>
          <label className="field">Von
            <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field">Bis
            <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <label className="field full">Notiz
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={submit} disabled={busy}>Anfrage stellen</button>
        </div>
        {conflicts.length > 0 && (
          <div style={{ marginTop: 10, padding: 10, border: '1px solid #f5b5b5', background: 'rgba(229,62,62,.08)', borderRadius: 8, color: '#a52834' }}>
            ⚠ Achtung: In der Abteilung <strong>{dept}</strong> hat im gleichen Zeitraum bereits jemand Urlaub:
            <ul style={{ margin: '6px 0 0 18px' }}>
              {conflicts.map((c) => <li key={c.id}>{c.personName}: {deDate(c.startDate)} – {deDate(c.endDate)}{c.status === 'pending' ? ' (offen)' : ''}</li>)}
            </ul>
          </div>
        )}
      </div>

      <strong>Offene Anfragen ({pending.length})</strong>
      {pending.length === 0 ? <div className="empty" style={{ padding: 20 }}>Keine offenen Anfragen.</div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Mitarbeiter</th><th>Abteilung</th><th>Zeitraum</th><th>Notiz</th><th className="right"></th></tr></thead>
          <tbody>
            {pending.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.personName}</strong></td>
                <td>{r.department || '—'}</td>
                <td>{deDate(r.startDate)} – {deDate(r.endDate)}</td>
                <td className="muted">{r.note || ''}</td>
                <td className="right">
                  <button className="btn sm" onClick={() => approve(r)}>✓ Bestätigen</button>{' '}
                  <button className="btn sm ghost" onClick={() => reject(r)}>✕ Ablehnen</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}

// ── Tab 3: Urlaubskalender (approved, filter by department) ────────────────
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const CAL_WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function Urlaubskalender({ departments }) {
  const [dept, setDept] = useState('all');
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [entries, setEntries] = useState([]);

  const load = async () => {
    try {
      const q = dept === 'all' ? '' : `&department=${encodeURIComponent(dept)}`;
      const d = unwrap(await api.get(`/desktop/hidden/vacations?status=approved${q}`));
      setEntries(d.entries || []);
    } catch (e) { setEntries([]); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dept]);

  const byDay = useMemo(() => {
    const map = {};
    for (const v of entries) {
      let d = parseISO(v.startDate); const end = parseISO(v.endDate);
      while (d <= end) { (map[iso(d)] = map[iso(d)] || []).push(v); d = addDays(d, 1); }
    }
    return map;
  }, [entries]);

  const weeks = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const off = (first.getDay() + 6) % 7;
    const start = new Date(cursor.y, cursor.m, 1 - off);
    const out = [];
    for (let w = 0; w < 6; w++) { const row = []; for (let i = 0; i < 7; i++) { const day = new Date(start); day.setDate(start.getDate() + w * 7 + i); row.push(day); } out.push(row); }
    return out;
  }, [cursor]);
  const move = (delta) => setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div>
      <div className="toolbar no-print" style={{ marginBottom: 10 }}>
        <button className="btn ghost" onClick={() => move(-1)}>←</button>
        <strong style={{ minWidth: 150, textAlign: 'center' }}>{MONTHS[cursor.m]} {cursor.y}</strong>
        <button className="btn ghost" onClick={() => move(1)}>→</button>
        <div className="spacer" />
        <select className="select" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="all">Alle Abteilungen</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="cal">
        <div className="cal-head">{CAL_WD.map((d) => <div key={d} className="cal-wd">{d}</div>)}</div>
        {weeks.map((week, wi) => (
          <div key={wi} className="cal-row">
            {week.map((day) => {
              const k = iso(day); const list = byDay[k] || []; const inMonth = day.getMonth() === cursor.m;
              return (
                <div key={k} className="cal-cell" style={{ opacity: inMonth ? 1 : 0.4 }}>
                  <div className="cal-daynum"><span>{day.getDate()}</span>{list.length ? <span className="badge open" style={{ fontSize: 11 }}>{list.length}</span> : null}</div>
                  <div className="cal-items">
                    {list.slice(0, 5).map((v) => (
                      <div key={v.id} className="cal-item" title={`${v.personName} (${v.department || ''})`} style={{ background: '#e6f0ff' }}>
                        {v.personName}
                      </div>
                    ))}
                    {list.length > 5 ? <div className="muted" style={{ fontSize: 11 }}>+{list.length - 5}</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
