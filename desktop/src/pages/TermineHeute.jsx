import React, { useEffect, useMemo, useState } from 'react';
import { backdropHandlers } from '../backdrop.js';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';
import { TYPES } from './Termine.jsx';

const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.key, t.label]));
const typeLabel = (t) => TYPE_LABEL[t] || t || 'Termin';
const hm = (t) => (t ? String(t).slice(0, 5) : '');
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The Fahrrad department's worklist for today: repair numbers + customer + who
// should do it. Each repair can be ticked off, or flagged red if it won't be done.
export default function TermineHeute({ user }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(iso(new Date()));
  const [warnFor, setWarnFor] = useState(null);   // appointment we're adding a warning to
  const [warnText, setWarnText] = useState('');

  const load = async () => {
    setLoading(true);
    try { setRows(unwrap(await api.get('/desktop/appointments')).appointments || []); }
    catch (e) { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const list = useMemo(() => rows
    .filter((a) => (a.department || '') === 'fahrrad' && String(a.date || '').slice(0, 10) === day && a.status !== 'cancelled')
    .sort((a, b) => String(a.startTime || '~').localeCompare(String(b.startTime || '~'))),
    [rows, day]);

  const toggleDone = async (a) => {
    try { await api.patch(`/desktop/appointments/${a.id}`, { workDone: !a.workDone }); load(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };
  const openWarn = (a) => { setWarnFor(a); setWarnText(a.warnNote || ''); };
  const saveWarn = async () => {
    try { await api.patch(`/desktop/appointments/${warnFor.id}`, { warnNote: warnText.trim() }); setWarnFor(null); load(); toast(warnText.trim() ? 'Warnung gespeichert' : 'Warnung entfernt'); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  const open = list.filter((a) => !a.workDone);
  const done = list.filter((a) => a.workDone);

  return (
    <div>
      <div className="toolbar no-print">
        <strong>Termine für {day.split('-').reverse().join('.')}</strong>
        <input className="input" type="date" value={day} onChange={(e) => setDay(e.target.value)} style={{ width: 160 }} />
        <div className="spacer" />
        <span className="muted">{open.length} offen · {done.length} erledigt</span>
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        : list.length === 0 ? <div className="empty"><div className="big">🚲</div>Keine Termine an diesem Tag.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th className="no-print" style={{ width: 40 }}>✓</th><th>Uhrzeit</th><th>Rep-Nr.</th><th>Kunde</th><th>Art</th><th>Kürzel</th><th className="no-print"></th></tr></thead>
            <tbody>
              {[...open, ...done].map((a) => (
                <tr key={a.id} style={{ ...(a.workDone ? { opacity: 0.55 } : {}), ...(a.warnNote ? { background: 'rgba(229,62,62,.08)' } : {}) }}>
                  <td className="no-print" style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={!!a.workDone} onChange={() => toggleDone(a)} title="Erledigt" />
                  </td>
                  <td>{hm(a.startTime) || '—'}</td>
                  <td><strong>{a.repairNumber || '—'}</strong></td>
                  <td>
                    {a.customerName || '—'}{a.customerNumber ? <span className="muted"> · Kd {a.customerNumber}</span> : null}
                    {a.phone ? <div className="muted" style={{ fontSize: 12 }}>☎ {a.phone}</div> : null}
                    {a.warnNote ? <div style={{ color: '#c53030', fontWeight: 700, fontSize: 12 }}>⚠ {a.warnNote}</div> : null}
                  </td>
                  <td>{typeLabel(a.type)}{a.title ? <div className="muted" style={{ fontSize: 12 }}>{a.title}</div> : null}</td>
                  <td>{a.assignedHandle || '—'}</td>
                  <td className="right no-print">
                    <button className="btn sm ghost" style={{ color: a.warnNote ? '#c53030' : undefined }} onClick={() => openWarn(a)}>⚠ Warnung</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

      {warnFor && (
        <div className="backdrop" {...backdropHandlers(() => setWarnFor(null))}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
            <h2>Warnung – wird nicht fertig</h2>
            <div className="muted" style={{ marginBottom: 8 }}>{warnFor.repairNumber ? `Rep-Nr. ${warnFor.repairNumber} · ` : ''}{warnFor.customerName || ''}</div>
            <textarea className="input" rows={3} value={warnText} onChange={(e) => setWarnText(e.target.value)} placeholder="z. B. Ersatzteil fehlt, wird morgen fertig…" autoFocus />
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Leer lassen + Speichern entfernt die Warnung.</div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setWarnFor(null)}>Abbrechen</button>
              <button className="btn" onClick={saveWarn}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
