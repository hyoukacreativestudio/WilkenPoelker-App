import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';
import { useLiveReload } from '../customers.jsx';

// Opening hours (summer and winter) and closed days. The same data the app
// shows; the website is rebuilt about a minute after a change.
const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const SEASONS = [
  { key: 'standard', label: 'Sommer', dates: '01.02. – 31.10.' },
  { key: 'winter', label: 'Winter', dates: '01.11. – 31.01.' },
];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const toWeek = (schedule) => {
  const byDay = new Map((schedule || []).map((d) => [d.dayOfWeek, d]));
  return WEEK.map((i) => {
    const d = byDay.get(i);
    return { dayOfWeek: i, isClosed: d ? !!d.isClosed : i === 0, periods: (d?.periods || []).map((p) => ({ open: p.open, close: p.close })) };
  });
};

function dayProblem(d) {
  if (d.isClosed) return null;
  if (!d.periods.length) return 'Bitte mindestens eine Zeit eintragen oder den Tag auf geschlossen stellen.';
  let last = '';
  for (const p of d.periods) {
    if (!TIME.test(p.open) || !TIME.test(p.close)) return 'Bitte alle Zeiten als HH:MM eintragen.';
    if (p.close <= p.open || p.open < last) return 'Jede Zeit muss nach dem Beginn enden, ohne Überschneidung.';
    last = p.close;
  }
  return null;
}

const fmtDate = (s) => (s ? s.split('-').reverse().join('.') : '');
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// All dates from..to (inclusive), at most 60
function dateRange(from, to) {
  if (!to || to === from) return [from];
  const out = [];
  const d = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (d <= end && out.length <= 60) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default function Oeffnungszeiten() {
  const toast = useToast();
  const [season, setSeason] = useState('standard');
  const [weeks, setWeeks] = useState({});
  const [saved, setSaved] = useState({});
  const [current, setCurrent] = useState(null); // season in force today
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const dirty = SEASONS.some((s) => weeks[s.key] && JSON.stringify(weeks[s.key]) !== saved[s.key]);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [summer, winter, now, hol] = await Promise.all([
        api.get('/settings/opening-hours?season=standard'),
        api.get('/settings/opening-hours?season=winter'),
        api.get('/settings/opening-hours'),
        api.get('/settings/holidays'),
      ]);
      setHolidays(unwrap(hol) || []);
      const inForce = unwrap(now)?.season || null;
      // First load: open the season that is in force today
      if (!silent && inForce) setSeason(inForce);
      setCurrent(inForce);
      // Never overwrite hours someone is typing right now
      if (silent && dirty) return;
      const next = { standard: toWeek(unwrap(summer)?.schedule), winter: toWeek(unwrap(winter)?.schedule) };
      setWeeks(next);
      setSaved({ standard: JSON.stringify(next.standard), winter: JSON.stringify(next.winter) });
    } catch (e) {
      if (!silent) toast(e.message, { type: 'error' });
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useLiveReload(load, [dirty]);

  const week = weeks[season] || [];
  const changeDay = (dayOfWeek, fn) => setWeeks((w) => ({ ...w, [season]: w[season].map((d) => (d.dayOfWeek === dayOfWeek ? fn(d) : d)) }));

  const saveHours = async () => {
    const clean = week;
    if (clean.some(dayProblem)) { setShowErrors(true); toast('Bitte die markierten Tage prüfen.', { type: 'error' }); return; }
    setBusy(true);
    try {
      const before = JSON.parse(saved[season] || '[]');
      let queued = false;
      for (const d of clean) {
        const old = before.find((b) => b.dayOfWeek === d.dayOfWeek);
        if (old && JSON.stringify(old) === JSON.stringify(d)) continue;
        const res = await api.put('/settings/opening-hours', { season, dayOfWeek: d.dayOfWeek, isClosed: d.isClosed, periods: d.isClosed ? [] : d.periods });
        if (res?.queued) queued = true;
      }
      setSaved((s) => ({ ...s, [season]: JSON.stringify(clean) }));
      setShowErrors(false);
      toast(queued ? 'Keine Verbindung: wird gespeichert, sobald der Server wieder erreichbar ist.' : 'Öffnungszeiten gespeichert. Die Website wird in etwa einer Minute aktualisiert.');
    } catch (e) {
      toast(e.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const copyMonday = () => {
    const mo = week.find((d) => d.dayOfWeek === 1);
    setWeeks((w) => ({ ...w, [season]: w[season].map((d) => (d.dayOfWeek >= 2 && d.dayOfWeek <= 5 ? { ...d, isClosed: mo.isClosed, periods: mo.periods.map((p) => ({ ...p })) } : d)) }));
  };

  // ── Closed days ──
  const [form, setForm] = useState({ from: '', to: '', name: '', closed: true, open: '09:00', close: '12:00', yearly: false });
  const upcoming = useMemo(() => {
    const today = todayIso();
    return holidays
      .filter((h) => h.isRecurring || h.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays]);

  const addHoliday = async (e) => {
    e.preventDefault();
    if (!form.from || !form.name.trim()) { toast('Bitte Datum und Bezeichnung eintragen.', { type: 'error' }); return; }
    if (form.to && form.to < form.from) { toast('Das Ende liegt vor dem Beginn.', { type: 'error' }); return; }
    if (!form.closed && (!TIME.test(form.open) || !TIME.test(form.close) || form.close <= form.open)) { toast('Bitte gültige Sonderöffnungszeiten eintragen.', { type: 'error' }); return; }
    const dates = dateRange(form.from, form.to);
    if (dates.length > 60) { toast('Höchstens 60 Tage auf einmal.', { type: 'error' }); return; }
    setBusy(true);
    let added = 0; let skipped = 0;
    try {
      for (const date of dates) {
        try {
          await api.post('/settings/holidays', {
            date, name: form.name.trim(), isClosed: form.closed, isRecurring: form.yearly,
            specialHours: form.closed ? null : [{ open: form.open, close: form.close }],
          });
          added += 1;
        } catch { skipped += 1; }
      }
      setForm((f) => ({ ...f, from: '', to: '', name: '' }));
      await load({ silent: true });
      toast(`${added === 1 ? '1 Tag' : `${added} Tage`} eingetragen${skipped ? `, ${skipped} gab es schon` : ''}.`);
    } finally {
      setBusy(false);
    }
  };

  const removeHoliday = async (h) => {
    if (!window.confirm(`${fmtDate(h.date)} (${h.name}) löschen?`)) return;
    try { await api.delete(`/settings/holidays/${h.id}`); setHolidays((l) => l.filter((x) => x.id !== h.id)); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  if (loading) return <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="toolbar">
        {SEASONS.map((s) => (
          <span key={s.key} className={`pill tab ${season === s.key ? 'active' : ''}`} onClick={() => { setSeason(s.key); setShowErrors(false); }}>
            {s.label} <span className="muted" style={{ color: 'inherit', opacity: 0.75 }}>{s.dates}</span>
            {current === s.key ? <span className="n">gilt jetzt</span> : null}
          </span>
        ))}
        <div className="spacer" />
        <button className="btn ghost" onClick={copyMonday} disabled={busy}>Montag für Di bis Fr übernehmen</button>
        <button className="btn" onClick={saveHours} disabled={busy || !weeks[season] || JSON.stringify(week) === saved[season]}>Speichern</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Tag</th><th>Geöffnet</th><th>Zeiten</th></tr></thead>
          <tbody>
            {week.map((d) => {
              const problem = showErrors ? dayProblem(d) : null;
              return (
                <tr key={d.dayOfWeek}>
                  <td className="nowrap" style={{ fontWeight: 650 }}>{DAYS[d.dayOfWeek]}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={!d.isClosed}
                      aria-label={`${DAYS[d.dayOfWeek]} geöffnet`}
                      onChange={(e) => changeDay(d.dayOfWeek, (x) => ({ ...x, isClosed: !e.target.checked, periods: x.periods.length ? x.periods : [{ open: '08:00', close: '13:00' }] }))}
                    />
                  </td>
                  <td>
                    {d.isClosed ? <span className="muted">Geschlossen</span> : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                        {d.periods.map((p, i) => (
                          <span key={i} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <input className="input" type="time" style={{ minWidth: 0, width: 110 }} value={p.open} aria-label="Von"
                              onChange={(e) => changeDay(d.dayOfWeek, (x) => ({ ...x, periods: x.periods.map((q, j) => (j === i ? { ...q, open: e.target.value } : q)) }))} />
                            bis
                            <input className="input" type="time" style={{ minWidth: 0, width: 110 }} value={p.close} aria-label="Bis"
                              onChange={(e) => changeDay(d.dayOfWeek, (x) => ({ ...x, periods: x.periods.map((q, j) => (j === i ? { ...q, close: e.target.value } : q)) }))} />
                            <button className="btn sm ghost" title="Zeit entfernen"
                              onClick={() => changeDay(d.dayOfWeek, (x) => { const periods = x.periods.filter((_, j) => j !== i); return { ...x, periods, isClosed: periods.length ? x.isClosed : true }; })}>✕</button>
                          </span>
                        ))}
                        {d.periods.length < 3 ? (
                          <button className="btn sm ghost" onClick={() => changeDay(d.dayOfWeek, (x) => ({ ...x, periods: [...x.periods, { open: x.periods[x.periods.length - 1]?.close || '08:00', close: '' }] }))}>+ Zeit</button>
                        ) : null}
                      </div>
                    )}
                    {problem ? <div style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 6 }}>{problem}</div> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12.5 }}>
        Gilt für die App, das PC-Programm und die Website. Die Website wird etwa eine Minute nach dem Speichern aktualisiert.
        {dirty ? ' Du hast ungespeicherte Änderungen.' : ''}
      </p>

      <div className="section-title">Geschlossene Tage und Sonderöffnungszeiten</div>
      <form onSubmit={addHoliday} className="table-wrap" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 14 }}>
        <label className="field">Von<input className="input" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></label>
        <label className="field">Bis (optional)<input className="input" type="date" value={form.to} min={form.from || undefined} onChange={(e) => setForm({ ...form, to: e.target.value })} /></label>
        <label className="field" style={{ flex: 1, minWidth: 200 }}>Bezeichnung<input className="input" maxLength={100} placeholder="z. B. Betriebsferien" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="field">Art
          <select className="select" value={form.closed ? 'zu' : 'sonder'} onChange={(e) => setForm({ ...form, closed: e.target.value === 'zu' })}>
            <option value="zu">Geschlossen</option>
            <option value="sonder">Sonderöffnungszeiten</option>
          </select>
        </label>
        {!form.closed ? (
          <>
            <label className="field">Öffnet<input className="input" type="time" style={{ minWidth: 0 }} value={form.open} onChange={(e) => setForm({ ...form, open: e.target.value })} /></label>
            <label className="field">Schließt<input className="input" type="time" style={{ minWidth: 0 }} value={form.close} onChange={(e) => setForm({ ...form, close: e.target.value })} /></label>
          </>
        ) : null}
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13.5, paddingBottom: 10 }}>
          <input type="checkbox" checked={form.yearly} onChange={(e) => setForm({ ...form, yearly: e.target.checked })} /> jedes Jahr
        </label>
        <button className="btn" type="submit" disabled={busy}>Eintragen</button>
      </form>

      {upcoming.length === 0 ? <div className="muted">Keine geschlossenen Tage eingetragen.</div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Datum</th><th>Bezeichnung</th><th>Art</th><th></th></tr></thead>
          <tbody>
            {upcoming.map((h) => (
              <tr key={h.id}>
                <td className="nowrap">{fmtDate(h.date)}{h.isRecurring ? <div className="sub2">jedes Jahr</div> : null}</td>
                <td>{h.name}</td>
                <td>{h.isClosed !== false ? 'Geschlossen' : `Geöffnet ${(h.specialHours || []).map((p) => `${p.open}–${p.close}`).join(', ')} Uhr`}</td>
                <td className="right"><button className="btn sm ghost" onClick={() => removeHoliday(h)}>Löschen</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
