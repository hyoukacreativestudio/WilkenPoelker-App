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
  const [tab, setTab] = useState('einstempeln');

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
          {[['einstempeln', '⏱️ Einstempeln'], ['auswertung', '📊 Auswertung']].map(([k, l]) => (
            <span key={k} className={`pill tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</span>
          ))}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {tab === 'einstempeln' && <Einstempeln />}
          {tab === 'auswertung' && <Auswertung />}
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
  const [note, setNote] = useState(''); // optional: what did you do (on clock-out)

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
      // Note is only sent on clock-out (when a session is running).
      const body = { name: name.trim(), activity: activity.trim() };
      if (running) body.note = note.trim();
      const d = unwrap(await api.post('/desktop/hidden/timeclock/punch', body));
      setRunning(d.running); setOpenEntry(d.entry || null);
      if (!d.running) setNote('');
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
        {running && (
          <label className="field" style={{ marginTop: 14 }}>Notiz (optional) – was hast du gemacht?
            <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="z. B. Kalender überarbeitet, Bugfixes…" />
          </label>
        )}
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

  const report = useMemo(() => buildReport(entries, from, to), [entries, from, to]);

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
                  <tr key={r.date}>
                    <td className="no-print" style={{ textAlign: 'center' }}>
                      {r.hours ? <input type="checkbox" title="Als erledigt abhaken" onChange={() => markDone(r.date, true)} /> : null}
                    </td>
                    <td>{deDate(r.date)}</td><td>{r.wd}</td>
                    <td>{r.hours ? r.activity : ''}{r.note ? <span className="muted"> · {r.note}</span> : null}</td>
                    <td className="right">{fmtH(r.hours)}</td>
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

// Aggregate punches per day, group into ISO weeks.
function buildReport(entries, from, to) {
  const hoursByDay = {};
  for (const e of entries) {
    if (!e.clockIn || !e.clockOut) continue;
    const day = iso(new Date(e.clockIn));
    const h = (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 3600000;
    if (h > 0) hoursByDay[day] = (hoursByDay[day] || 0) + h;
  }
  const activityByDay = {}; const noteByDay = {};
  for (const e of entries) {
    if (!e.clockIn) continue;
    const day = iso(new Date(e.clockIn));
    activityByDay[day] = e.activity || 'App-Entwicklung';
    if (e.note) noteByDay[day] = noteByDay[day] ? `${noteByDay[day]}; ${e.note}` : e.note;
  }

  const weeks = new Map();
  let d = parseISO(from); const end = parseISO(to);
  while (d <= end) {
    const k = iso(d);
    if (hoursByDay[k] > 0) {
      const { week, year } = isoWeek(d);
      const wk = `${year}-${pad(week)}`;
      if (!weeks.has(wk)) { const mon = mondayOf(d); weeks.set(wk, { week, year, start: iso(mon), end: iso(addDays(mon, 6)), rows: [], total: 0 }); }
      const w = weeks.get(wk);
      w.rows.push({ date: k, wd: wd(d), hours: hoursByDay[k], activity: activityByDay[k] || 'App-Entwicklung', note: noteByDay[k] || '' });
      w.total += hoursByDay[k];
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
        ...w.rows.map((r) => [deDate(r.date), r.wd, r.note ? `${r.activity} · ${r.note}` : r.activity, fmtH(r.hours)]),
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
