import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [tab, setTab] = useState('einstempeln');
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
          {[['einstempeln', '⏱️ Einstempeln'], ['auswertung', '📊 Auswertung'], ['anfragen', '📝 Urlaubsanfragen'], ['kalender', '📅 Urlaubskalender']].map(([k, l]) => (
            <span key={k} className={`pill tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</span>
          ))}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {tab === 'einstempeln' && <Einstempeln />}
          {tab === 'auswertung' && <Auswertung />}
          {tab === 'anfragen' && <Urlaubsanfragen employees={employees} onChanged={() => {}} />}
          {tab === 'kalender' && <Urlaubskalender departments={departments} />}
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: Einstempeln ─────────────────────────────────────────────────────
function Einstempeln() {
  const toast = useToast();
  const [name, setName] = useState(() => localStorage.getItem('wp_stempel_name') || '');
  const [activity, setActivity] = useState(() => localStorage.getItem('wp_stempel_activity') || 'App-Entwicklung');
  const [running, setRunning] = useState(false);
  const [openEntry, setOpenEntry] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const loadStatus = async (nm) => {
    if (!nm) return;
    try { const d = unwrap(await api.get(`/desktop/hidden/timeclock/status?name=${encodeURIComponent(nm)}`)); setRunning(d.running); setOpenEntry(d.entry || null); }
    catch (e) { /* ignore */ }
  };
  useEffect(() => { loadStatus(name); /* eslint-disable-next-line */ }, []);

  const punch = async () => {
    if (!name.trim()) { toast('Bitte zuerst deinen Namen eingeben', { type: 'error' }); return; }
    localStorage.setItem('wp_stempel_name', name.trim());
    localStorage.setItem('wp_stempel_activity', activity.trim() || 'App-Entwicklung');
    try {
      const d = unwrap(await api.post('/desktop/hidden/timeclock/punch', { name: name.trim(), activity: activity.trim() }));
      setRunning(d.running); setOpenEntry(d.entry || null);
      toast(d.running ? 'Eingestempelt' : 'Ausgestempelt');
    } catch (e) { toast(e.message, { type: 'error' }); }
  };

  const elapsed = openEntry && running ? Math.max(0, now - new Date(openEntry.clockIn).getTime()) : 0;
  const elapsedStr = `${pad(Math.floor(elapsed / 3600000))}:${pad(Math.floor(elapsed / 60000) % 60)}:${pad(Math.floor(elapsed / 1000) % 60)}`;

  return (
    <div>
      <div className="card" style={{ padding: 18, maxWidth: 520, margin: '0 auto' }}>
        <div className="form-grid">
          <label className="field">Name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" />
          </label>
          <label className="field">Tätigkeit
            <input className="input" value={activity} onChange={(e) => setActivity(e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button className="btn" style={{ background: running ? '#E53E3E' : undefined, fontSize: 18, padding: '14px 28px' }} onClick={punch}>
            {running ? '■ Ausstempeln' : '▶ Einstempeln'}
          </button>
          {running
            ? <span style={{ fontSize: 30, fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>{elapsedStr}</span>
            : <span className="muted">nicht eingestempelt</span>}
          {running && openEntry ? <span className="muted">seit {new Date(openEntry.clockIn).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span> : null}
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Auswertung (report + who's clocked in + PDF) ─────────────────────
function Auswertung() {
  const toast = useToast();
  const today = new Date();
  const [names, setNames] = useState([]);
  const [name, setName] = useState(() => localStorage.getItem('wp_stempel_name') || '');
  const [from, setFrom] = useState(iso(addDays(mondayOf(today), -49)));
  const [to, setTo] = useState(iso(today));
  const [entries, setEntries] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [doneEntries, setDoneEntries] = useState([]);
  const [showDone, setShowDone] = useState(false);
  const [nowRunning, setNowRunning] = useState([]);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(t); }, []);

  // Who is clocked in right now (refreshed every 20s + on mount).
  const loadRunning = async () => {
    try { const d = unwrap(await api.get('/desktop/hidden/timeclock/running')); setNowRunning(d.entries || []); }
    catch (e) { setNowRunning([]); }
  };
  useEffect(() => { loadRunning(); const t = setInterval(loadRunning, 20000); return () => clearInterval(t); }, []);

  const loadReport = async () => {
    if (!name) { setEntries([]); return; }
    try {
      const d = unwrap(await api.get(`/desktop/hidden/timeclock?name=${encodeURIComponent(name)}&from=${from}&to=${to}&scope=active`));
      setEntries(d.entries || []);
      setNames(d.names || []);
      const dn = unwrap(await api.get(`/desktop/hidden/timeclock?name=${encodeURIComponent(name)}&scope=done`));
      setDoneEntries(dn.entries || []);
      const v = unwrap(await api.get(`/desktop/hidden/vacations?status=approved&from=${from}&to=${to}`));
      setVacations((v.entries || []).filter((e) => e.personName === name));
    } catch (e) { setEntries([]); }
  };
  // Load the names list once even before a person is chosen.
  useEffect(() => { (async () => { try { const d = unwrap(await api.get('/desktop/hidden/timeclock')); setNames(d.names || []); } catch (e) {} })(); }, []);
  useEffect(() => { loadReport(); /* eslint-disable-next-line */ }, [name, from, to]);

  const markDone = async (date, done) => {
    try { await api.post('/desktop/hidden/timeclock/done', { name, date, done }); loadReport(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  const doneDays = useMemo(() => {
    const map = {};
    for (const e of doneEntries) {
      const day = iso(new Date(e.clockIn));
      const h = e.clockOut ? (new Date(e.clockOut) - new Date(e.clockIn)) / 3600000 : 0;
      if (!map[day]) map[day] = { date: day, hours: 0, doneAt: e.doneAt };
      map[day].hours += h;
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [doneEntries]);

  const report = useMemo(() => buildReport(entries, vacations, from, to), [entries, vacations, from, to]);

  return (
    <div>
      {/* Who is currently clocked in */}
      <div className="card" style={{ padding: 12, marginBottom: 12, background: nowRunning.length ? 'rgba(31,122,69,.08)' : undefined }}>
        <strong>🟢 Aktuell eingestempelt</strong>
        {nowRunning.length === 0 ? <span className="muted" style={{ marginLeft: 8 }}>gerade niemand</span> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            {nowRunning.map((e) => {
              const el = Math.max(0, tick - new Date(e.clockIn).getTime());
              const es = `${pad(Math.floor(el / 3600000))}:${pad(Math.floor(el / 60000) % 60)}`;
              return (
                <span key={e.id} className="badge" style={{ background: '#1f7a45', color: '#fff' }}>
                  {e.personName} · {es} h (seit {new Date(e.clockIn).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="toolbar no-print" style={{ marginBottom: 8 }}>
        <select className="select" value={name} onChange={(e) => setName(e.target.value)}>
          <option value="">— Mitarbeiter wählen —</option>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <div className="spacer" />
        <label className="muted">von <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} /></label>
        <label className="muted">bis <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} /></label>
        <button className="btn" onClick={() => savePDF(name, report)} disabled={!name || report.length === 0}>💾 PDF speichern</button>
      </div>

      {!name ? <div className="empty"><div className="big">📊</div>Bitte oben einen Mitarbeiter wählen.</div>
        : report.length === 0 ? <div className="empty"><div className="big">⏱️</div>Keine Zeiten im Zeitraum.</div>
        : report.map((w) => (
          <div key={`${w.year}-${w.week}`} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, color: 'var(--dept)', marginBottom: 6 }}>KW {w.week} · {deDate(w.start).slice(0, 6)} – {deDate(w.end)}</div>
            <div className="table-wrap"><table>
              <thead><tr><th className="no-print" style={{ width: 34 }}>✓</th><th>Datum</th><th>Tag</th><th>Tätigkeit</th><th className="right">Stunden</th></tr></thead>
              <tbody>
                {w.rows.map((r) => (
                  <tr key={r.date} style={r.absence ? { color: '#8a94a6' } : undefined}>
                    <td className="no-print" style={{ textAlign: 'center' }}>
                      {!r.absence && r.hours ? <input type="checkbox" title="Als erledigt abhaken" onChange={() => markDone(r.date, true)} /> : null}
                    </td>
                    <td>{deDate(r.date)}</td><td>{r.wd}</td>
                    <td>{r.absence ? r.absenceLabel : (r.hours ? r.activity : '')}</td>
                    <td className="right">{r.absence ? '–' : fmtH(r.hours)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700, background: 'var(--dept-soft)' }}>
                  <td className="no-print"></td><td></td><td></td><td>Summe KW {w.week}</td><td className="right">{fmtH(w.total)}</td>
                </tr>
              </tbody>
            </table></div>
          </div>
        ))}

      {/* Erledigte Tage: rückgängig innerhalb einer Woche, danach Auto-Löschung */}
      <div style={{ marginTop: 16, borderTop: '1px solid var(--dept-soft)', paddingTop: 10 }}>
        <button className="btn ghost" onClick={() => setShowDone((s) => !s)}>
          {showDone ? '▾' : '▸'} Erledigt ({doneDays.length})
        </button>
        {showDone && (
          doneDays.length === 0 ? <div className="muted" style={{ padding: 10 }}>Keine erledigten Tage.</div> : (
            <>
              <div className="muted" style={{ fontSize: 12, margin: '6px 0' }}>Abgehakte Tage werden nach 1 Woche automatisch gelöscht.</div>
              <div className="table-wrap"><table>
                <thead><tr><th>Datum</th><th className="right">Stunden</th><th>Erledigt am</th><th className="right"></th></tr></thead>
                <tbody>
                  {doneDays.map((d) => (
                    <tr key={d.date}>
                      <td>{deDate(d.date)}</td>
                      <td className="right">{fmtH(d.hours)}</td>
                      <td className="muted">{d.doneAt ? deDate(String(d.doneAt).slice(0, 10)) : ''}</td>
                      <td className="right"><button className="btn sm ghost" onClick={() => markDone(d.date, false)}>↩ Rückgängig</button></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </>
          )
        )}
      </div>
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
  const vacType = {};
  for (const v of vacations) { let d = parseISO(v.startDate); const end = parseISO(v.endDate); while (d <= end) { vacType[iso(d)] = v.type || 'urlaub'; d = addDays(d, 1); } }

  const weeks = new Map();
  let d = parseISO(from); const end = parseISO(to);
  while (d <= end) {
    const k = iso(d);
    const hasWork = hoursByDay[k] > 0;
    const isVac = !!vacType[k];
    if (hasWork || isVac) {
      const { week, year } = isoWeek(d);
      const wk = `${year}-${pad(week)}`;
      if (!weeks.has(wk)) { const mon = mondayOf(d); weeks.set(wk, { week, year, start: iso(mon), end: iso(addDays(mon, 6)), rows: [], total: 0 }); }
      const w = weeks.get(wk);
      const absence = isVac && !hasWork;
      w.rows.push({ date: k, wd: wd(d), hours: hoursByDay[k] || 0, activity: activityByDay[k] || 'App-Entwicklung', absence, absenceLabel: vacType[k] === 'krank' ? 'Krankmeldung' : 'Urlaub' });
      if (hasWork) w.total += hoursByDay[k];
    }
    d = addDays(d, 1);
  }
  return [...weeks.values()];
}

// Generate + download a real PDF (jsPDF), laid out like the boss's report.
function savePDF(name, report) {
  if (!report.length) return;
  const doc = new jsPDF();
  const totalH = report.reduce((s, w) => s + w.total, 0);
  const first = report[0], last = report[report.length - 1];
  doc.setFontSize(16); doc.setTextColor(26, 35, 48);
  doc.text('Homeoffice-Stunden · Zeiterfassung', 14, 18);
  doc.setFontSize(11); doc.setTextColor(90, 100, 115);
  doc.text(`${name} · ${deDate(first.start)} – ${deDate(last.end)} · gesamt ${fmtH(totalH)}`, 14, 25);

  let y = 32;
  for (const w of report) {
    if (y > 260) { doc.addPage(); y = 18; }
    doc.setFontSize(12); doc.setTextColor(34, 81, 111);
    doc.text(`KW ${w.week} · ${deDate(w.start).slice(0, 6)} – ${deDate(w.end)}`, 14, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Datum', 'Tag', 'Tätigkeit', 'Stunden']],
      body: [
        ...w.rows.map((r) => [deDate(r.date), r.wd, r.absence ? r.absenceLabel : (r.hours ? r.activity : ''), r.absence ? '–' : fmtH(r.hours)]),
        [{ content: '', colSpan: 2 }, { content: `Summe KW ${w.week}`, styles: { fontStyle: 'bold' } }, { content: fmtH(w.total), styles: { fontStyle: 'bold', halign: 'right' } }],
      ],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [34, 81, 111], textColor: 255 },
      columnStyles: { 3: { halign: 'right' } },
      theme: 'grid',
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }
  const safe = name.replace(/[^\wäöüÄÖÜß-]+/g, '_');
  doc.save(`Zeiterfassung_${safe}.pdf`);
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
const ABSENCE_LABEL = { urlaub: 'Urlaub', krank: 'Krankmeldung', sonstiges: 'Sonstiges' };
function Urlaubskalender({ departments }) {
  const toast = useToast();
  const [dept, setDept] = useState('all');
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [entries, setEntries] = useState([]);
  const [openDay, setOpenDay] = useState(null);

  const load = async () => {
    try {
      const q = dept === 'all' ? '' : `&department=${encodeURIComponent(dept)}`;
      const d = unwrap(await api.get(`/desktop/hidden/vacations?status=approved${q}`));
      setEntries(d.entries || []);
    } catch (e) { setEntries([]); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dept]);

  const removeVacation = async (v) => {
    if (!confirm(`Urlaub von ${v.personName} löschen?`)) return;
    try { await api.del(`/desktop/hidden/vacations/${v.id}`); toast('Gelöscht'); load(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

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
                <div key={k} className="cal-cell" style={{ opacity: inMonth ? 1 : 0.4, cursor: list.length ? 'pointer' : 'default' }} onClick={() => { if (list.length) setOpenDay(k); }}>
                  <div className="cal-daynum"><span>{day.getDate()}</span>{list.length ? <span className="badge open" style={{ fontSize: 11 }}>{list.length}</span> : null}</div>
                  <div className="cal-items">
                    {list.slice(0, 5).map((v) => (
                      <div key={v.id} title={`${v.personName} (${v.department || ''})`}
                        style={{ background: '#2b6cb0', color: '#fff', borderRadius: 4, padding: '1px 5px', margin: '2px 0', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {v.personName}
                      </div>
                    ))}
                    {list.length > 5 ? <div className="muted" style={{ fontSize: 11 }}>+{list.length - 5} mehr</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Open a day → everything cleanly listed */}
      {openDay && (
        <div className="backdrop" onClick={() => setOpenDay(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
            <h2>Urlaub am {deDate(openDay)}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
              {(byDay[openDay] || []).map((v) => (
                <div key={v.id} className="card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <strong>{v.personName}</strong>
                    {v.department ? <span className="muted"> · {v.department}</span> : null}
                    <div className="muted" style={{ fontSize: 12 }}>
                      {ABSENCE_LABEL[v.type] || 'Urlaub'} · {deDate(v.startDate)} – {deDate(v.endDate)}{v.note ? ` · ${v.note}` : ''}
                    </div>
                  </div>
                  <button className="btn sm ghost" onClick={() => removeVacation(v)}>✕</button>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setOpenDay(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
