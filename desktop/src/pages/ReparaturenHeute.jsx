import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';

const savedHandle = () => localStorage.getItem('wp_handle') || '';
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const emptyJob = () => ({ repairNumber: '', customerName: '', customerNumber: '', phone: '', device: '', assignedTo: '', date: iso(new Date()), note: '', handle: savedHandle() });

// Repair worklist for the bike workshop. Service assigns repairs (by number) to
// individual mechanics; mechanics tick them off or flag a warning. Unfinished
// jobs from earlier days are rolled onto today automatically by the backend.
export default function ReparaturenHeute({ user }) {
  const toast = useToast();
  const isService = ['service_manager', 'admin', 'super_admin'].includes(user.role);
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(iso(new Date()));
  const [who, setWho] = useState('all');            // employee filter
  const [form, setForm] = useState(null);           // create-job modal
  const [warnFor, setWarnFor] = useState(null);
  const [warnText, setWarnText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ date: day });
      const d = unwrap(await api.get(`/desktop/repairjobs?${q.toString()}`));
      setJobs(d.jobs || []); setEmployees(d.employees || []);
    } catch (e) { setJobs([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); /* eslint-disable-next-line */ }, [day]);

  const list = useMemo(() => (who === 'all' ? jobs : jobs.filter((j) => j.assignedTo === who))
    .slice().sort((a, b) => (a.done - b.done) || String(a.repairNumber).localeCompare(String(b.repairNumber), undefined, { numeric: true })),
    [jobs, who]);

  const patch = async (j, body) => { try { await api.patch(`/desktop/repairjobs/${j.id}`, body); load(); } catch (e) { toast(e.message, { type: 'error' }); } };
  const toggleDone = (j) => patch(j, { done: !j.done });
  const reassign = (j, assignedTo) => patch(j, { assignedTo });
  const del = async (j) => { if (!confirm(`Reparatur ${j.repairNumber} löschen?`)) return; try { await api.del(`/desktop/repairjobs/${j.id}`); load(); } catch (e) { toast(e.message, { type: 'error' }); } };

  const openWarn = (j) => { setWarnFor(j); setWarnText(j.warnNote || ''); };
  const saveWarn = async () => { await patch(warnFor, { warnNote: warnText.trim() }); setWarnFor(null); toast(warnText.trim() ? 'Warnung gespeichert' : 'Warnung entfernt'); };

  const submitForm = async () => {
    if (!form.repairNumber.trim()) { toast('Rep-Nr. ist erforderlich', { type: 'error' }); return; }
    setBusy(true);
    try {
      if (form.id) await api.patch(`/desktop/repairjobs/${form.id}`, form);
      else await api.post('/desktop/repairjobs', form);
      setForm(null); load(); toast('Gespeichert');
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };

  const openCount = list.filter((j) => !j.done).length;

  return (
    <div>
      <div className="toolbar no-print">
        <strong>Reparaturen · {day.split('-').reverse().join('.')}</strong>
        <input className="input" type="date" value={day} onChange={(e) => setDay(e.target.value)} style={{ width: 160 }} />
        <select className="select" value={who} onChange={(e) => setWho(e.target.value)} title="Nach Mitarbeiter filtern">
          <option value="all">Alle Mitarbeiter</option>
          {employees.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <div className="spacer" />
        <span className="muted">{openCount} offen</span>
        {isService ? <button className="btn" onClick={() => setForm(emptyJob())}>+ Reparatur</button> : null}
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        : list.length === 0 ? <div className="empty"><div className="big">🔧</div>Keine Reparaturen{who !== 'all' ? ` für ${who}` : ''}.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th className="no-print" style={{ width: 40 }}>✓</th><th>Rep-Nr.</th><th>Kunde</th><th>Gerät</th><th>Mitarbeiter</th><th className="no-print"></th></tr></thead>
            <tbody>
              {list.map((j) => (
                <tr key={j.id} style={{ ...(j.done ? { opacity: 0.55 } : {}), ...(j.warnNote ? { background: 'rgba(229,62,62,.08)' } : {}) }}>
                  <td className="no-print" style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={!!j.done} onChange={() => toggleDone(j)} title="Erledigt" />
                  </td>
                  <td><strong>{j.repairNumber}</strong></td>
                  <td>
                    {j.customerName || '—'}{j.customerNumber ? <span className="muted"> · Kd {j.customerNumber}</span> : null}
                    {j.phone ? <div className="muted" style={{ fontSize: 12 }}>☎ {j.phone}</div> : null}
                    {j.note ? <div className="muted" style={{ fontSize: 12 }}>{j.note}</div> : null}
                    {j.warnNote ? <div style={{ color: '#c53030', fontWeight: 700, fontSize: 12 }}>⚠ {j.warnNote}</div> : null}
                  </td>
                  <td>{j.device || '—'}</td>
                  <td>
                    {isService ? (
                      <select className="input" style={{ minWidth: 150 }} value={j.assignedTo || ''} onChange={(e) => reassign(j, e.target.value)}>
                        <option value="">— niemand —</option>
                        {employees.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    ) : (j.assignedTo || '—')}
                  </td>
                  <td className="right no-print">
                    <button className="btn sm ghost" style={{ color: j.warnNote ? '#c53030' : undefined }} onClick={() => openWarn(j)}>⚠</button>{' '}
                    {isService ? <><button className="btn sm ghost" onClick={() => setForm({ ...j, date: String(j.date).slice(0, 10), handle: savedHandle() })}>✏️</button>{' '}
                      <button className="btn sm ghost" onClick={() => del(j)}>✕</button></> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

      {/* Warning modal */}
      {warnFor && (
        <div className="backdrop" onClick={() => setWarnFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
            <h2>Warnung – wird nicht fertig</h2>
            <div className="muted" style={{ marginBottom: 8 }}>Rep-Nr. {warnFor.repairNumber}{warnFor.customerName ? ` · ${warnFor.customerName}` : ''}</div>
            <textarea className="input" rows={3} value={warnText} onChange={(e) => setWarnText(e.target.value)} placeholder="z. B. Ersatzteil fehlt…" autoFocus />
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Leer lassen + Speichern entfernt die Warnung.</div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setWarnFor(null)}>Abbrechen</button>
              <button className="btn" onClick={saveWarn}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / edit job (Service) */}
      {form && (
        <div className="backdrop" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Reparatur bearbeiten' : 'Neue Reparatur'}</h2>
            <div className="form-grid">
              <label className="field">Rep-Nr. *
                <input className="input" value={form.repairNumber} onChange={(e) => setForm({ ...form, repairNumber: e.target.value })} autoFocus />
              </label>
              <label className="field">Mitarbeiter
                <select className="input" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
                  <option value="">— niemand —</option>
                  {employees.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="field">Kundenname
                <input className="input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </label>
              <label className="field">Kundennummer
                <input className="input" value={form.customerNumber} onChange={(e) => setForm({ ...form, customerNumber: e.target.value })} />
              </label>
              <label className="field">Telefon
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="field">Gerät
                <input className="input" value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} />
              </label>
              <label className="field">Datum
                <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </label>
              <label className="field full">Notiz
                <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setForm(null)}>Abbrechen</button>
              <button className="btn" onClick={submitForm} disabled={busy || !form.repairNumber.trim()}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
