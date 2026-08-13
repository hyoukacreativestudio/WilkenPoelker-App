import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';

// Appointments created in the app show up here automatically (same backend).
// Staff can also create their own by hand with a free-text customer.
// Sortable by date, customer, type. Past (>24h) appointments are hidden.
const TYPES = [
  { key: 'repair', label: 'Reparatur' },
  { key: 'pickup', label: 'Abholung' },
  { key: 'delivery', label: 'Lieferung' },
  { key: 'inspection', label: 'Inspektion' },
  { key: 'consultation', label: 'Beratung' },
  { key: 'service', label: 'Service' },
  { key: 'other', label: 'Sonstiges' },
];
const typeLabel = (k) => TYPES.find((t) => t.key === k)?.label || k || '—';
const STATUS_LABEL = { pending: 'Anfrage', proposed: 'Vorgeschlagen', confirmed: 'Bestätigt', completed: 'Erledigt', cancelled: 'Storniert', rescheduled: 'Verschoben' };
const savedHandle = () => localStorage.getItem('wp_handle') || '';
const emptyForm = () => ({ title: '', type: 'repair', date: '', startTime: '', endTime: '', customerName: '', customerNumber: '', phone: '', description: '', handle: savedHandle() });

export default function Termine() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState({ key: 'date', dir: 'asc' });
  const [kind, setKind] = useState('laufend'); // anfragen | laufend | alle
  const [type, setType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);       // appointment shown in the action modal
  const [propDate, setPropDate] = useState('');
  const [propText, setPropText] = useState('');
  const [question, setQuestion] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = unwrap(await api.get('/desktop/appointments'));
      setRows(res.appointments || []);
    } catch (e) { setError(e.message); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Requests (customer asked, not yet scheduled) vs running (confirmed) appointments
  const REQUEST_STATES = ['pending', 'proposed', 'rescheduled'];
  const isRequest = (a) => REQUEST_STATES.includes(a.status);
  const requestCount = useMemo(() => rows.filter(isRequest).length, [rows]);

  // Hide appointments more than 24h in the past
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const filtered = useMemo(
    () => rows.filter((a) => {
      if (kind === 'anfragen' && !isRequest(a)) return false;
      if (kind === 'laufend' && a.status !== 'confirmed') return false;
      if (type !== 'all' && a.type !== type) return false;
      if (a.date && String(a.date).slice(0, 10) < cutoff) return false;
      return true;
    }),
    [rows, kind, type, cutoff]
  );
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      const av = String(a[key] ?? '').toLowerCase();
      const bv = String(b[key] ?? '').toLowerCase();
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort]);
  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const arrow = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      title: a.title || '', type: a.type || 'repair', date: a.date ? String(a.date).slice(0, 10) : '',
      startTime: a.startTime ? String(a.startTime).slice(0, 5) : '', endTime: a.endTime ? String(a.endTime).slice(0, 5) : '',
      customerName: a.customerName || '', customerNumber: a.customerNumber || '', phone: a.phone || '', description: a.description || '',
      handle: a.handle || savedHandle(),
    });
    setShowForm(true);
  };
  const submit = async () => {
    if (!form.handle.trim()) { toast('Bitte dein Kürzel angeben', { type: 'error' }); return; }
    setBusy(true);
    try {
      localStorage.setItem('wp_handle', form.handle.trim());
      if (editingId) { await api.patch(`/desktop/appointments/${editingId}`, form); toast('Termin gespeichert'); }
      else { await api.post('/desktop/appointments', form); toast('Termin angelegt'); }
      setShowForm(false); setEditingId(null); setForm(emptyForm()); load();
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const del = async (a) => { if (confirm('Termin löschen?')) { try { await api.del(`/desktop/appointments/${a.id}`); setDetail(null); load(); } catch (e) { toast(e.message, { type: 'error' }); } } };

  const openDetail = (a) => { setDetail(a); setPropDate(a.date ? String(a.date).slice(0, 10) : ''); setPropText(''); setQuestion(''); };
  const confirmAppt = async (a) => { setBusy(true); try { await api.post(`/desktop/appointments/${a.id}/confirm`); setDetail(null); load(); toast('Termin bestätigt'); } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); } };
  const proposeAppt = async () => {
    if (!propDate) { toast('Bitte Datum wählen', { type: 'error' }); return; }
    if (!propText.trim()) { toast('Bitte Text für den Vorschlag', { type: 'error' }); return; }
    setBusy(true);
    try { await api.post(`/desktop/appointments/${detail.id}/propose`, { date: propDate, proposedText: propText.trim() }); setDetail(null); load(); toast('Vorschlag an Kunde gesendet'); }
    catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const askQuestion = async () => {
    if (!question.trim()) { toast('Bitte Rückfrage eingeben', { type: 'error' }); return; }
    setBusy(true);
    try { await api.post(`/desktop/appointments/${detail.id}/question`, { question: question.trim() }); setDetail(null); load(); toast('Rückfrage an Kunde gesendet'); }
    catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="toolbar no-print">
        <span className={`pill tab ${kind === 'anfragen' ? 'active' : ''}`} onClick={() => setKind('anfragen')}>
          Anfragen{requestCount ? <span className="n">{requestCount}</span> : null}
        </span>
        <span className={`pill tab ${kind === 'laufend' ? 'active' : ''}`} onClick={() => setKind('laufend')}>Laufende Termine</span>
        <span className={`pill tab ${kind === 'alle' ? 'active' : ''}`} onClick={() => setKind('alle')}>Alle</span>
        <div className="spacer" />
        <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">Alle Arten</option>
          {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
        <button className="btn" onClick={openNew}>+ Neuer Termin</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : error ? (
        <div className="empty"><div className="big">📅</div>Termine konnten nicht geladen werden.<div className="muted">{error}</div></div>
      ) : sorted.length === 0 ? (
        <div className="empty"><div className="big">📅</div>Keine Termine.</div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('date')}>Datum{arrow('date')}</th>
              <th className="sortable" onClick={() => toggleSort('startTime')}>Uhrzeit{arrow('startTime')}</th>
              <th className="sortable" onClick={() => toggleSort('customerName')}>Kunde{arrow('customerName')}</th>
              <th className="sortable" onClick={() => toggleSort('title')}>Titel{arrow('title')}</th>
              <th className="sortable" onClick={() => toggleSort('type')}>Art{arrow('type')}</th>
              <th className="sortable" onClick={() => toggleSort('handle')}>Kürzel{arrow('handle')}</th>
              <th className="sortable" onClick={() => toggleSort('status')}>Status{arrow('status')}</th>
              <th className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id}>
                <td>{a.date || '—'}</td>
                <td>{a.startTime ? String(a.startTime).slice(0, 5) : ''}</td>
                <td>
                  {a.customerName || '—'}
                  {a.customerNumber ? <div className="muted">Kd {a.customerNumber}</div> : null}
                  {a.phone ? <div className="sub2">☎ {a.phone}</div> : null}
                </td>
                <td>{a.title || '—'}{a.createdByStaff ? <span className="badge open" style={{ marginLeft: 6 }}>manuell</span> : null}</td>
                <td>{typeLabel(a.type)}</td>
                <td>{a.handle || '—'}</td>
                <td>{isRequest(a) ? <span className="badge open">Anfrage</span> : (STATUS_LABEL[a.status] || a.status || '—')}</td>
                <td className="right no-print nowrap">
                  {isRequest(a) ? <button className="btn sm" onClick={() => openDetail(a)}>Bearbeiten</button> : null}
                  {a.createdByStaff ? <>
                    {' '}<button className="btn sm ghost" onClick={() => openEdit(a)}>✏️</button>
                    {' '}<button className="btn sm ghost" onClick={() => del(a)}>✕</button>
                  </> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {/* Request action modal: propose a date (customer confirms), confirm, or ask */}
      {detail && (
        <div className="backdrop" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Terminanfrage</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 12px', fontSize: 14, marginBottom: 14 }}>
              <span className="muted">Kunde</span><span>{detail.customerName || '—'}{detail.customerNumber ? ` (Kd ${detail.customerNumber})` : ''}</span>
              {detail.phone ? <><span className="muted">Telefon</span><span>☎ {detail.phone}</span></> : null}
              <span className="muted">Wunsch</span><span><strong>{detail.title || '—'}</strong> · {typeLabel(detail.type)}</span>
              {detail.description ? <><span className="muted">Notiz</span><span>{detail.description}</span></> : null}
              <span className="muted">Status</span><span>{STATUS_LABEL[detail.status] || detail.status}</span>
              {detail.proposedText ? <><span className="muted">Vorschlag</span><span>{detail.date} · {detail.proposedText}</span></> : null}
              {detail.customerNote ? <><span className="muted">Kunde schrieb</span><span>{detail.customerNote}</span></> : null}
            </div>

            {detail.status === 'proposed' ? (
              <div className="card" style={{ padding: 12, marginBottom: 14 }}>⏳ Warte auf Bestätigung des Kunden zum {detail.date}.</div>
            ) : null}

            {/* Propose a date — customer must accept it in the app */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div className="sub2" style={{ marginBottom: 6, fontWeight: 700 }}>Termin vorschlagen</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input className="input" type="date" style={{ maxWidth: 170 }} value={propDate} onChange={(e) => setPropDate(e.target.value)} />
                <input className="input" style={{ flex: 1, minWidth: 160 }} value={propText} placeholder="z. B. 10:00 Uhr, bitte Gerät mitbringen" onChange={(e) => setPropText(e.target.value)} />
                <button className="btn" onClick={proposeAppt} disabled={busy}>Vorschlagen</button>
              </div>
            </div>

            {/* Ask a follow-up question */}
            <div style={{ marginTop: 12 }}>
              <div className="sub2" style={{ marginBottom: 6, fontWeight: 700 }}>Rückfrage an Kunde</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" style={{ flex: 1 }} value={question} placeholder="Frage an den Kunden…" onChange={(e) => setQuestion(e.target.value)} />
                <button className="btn ghost" onClick={askQuestion} disabled={busy}>Senden</button>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button className="btn ghost" onClick={() => del(detail)}>Ablehnen / löschen</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost" onClick={() => setDetail(null)}>Schließen</button>
                <button className="btn" onClick={() => confirmAppt(detail)} disabled={busy}>Direkt bestätigen ✓</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
            <div className="form-grid">
              <label className="field full">Titel
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="z. B. Reparatur E-Bike" autoFocus />
              </label>
              <label className="field">Dein Kürzel *
                <input className="input" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="z. B. MK" />
              </label>
              <label className="field">Art
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </label>
              <label className="field">Datum
                <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </label>
              <label className="field">Von
                <input className="input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </label>
              <label className="field">Bis
                <input className="input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
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
              <label className="field full">Notiz
                <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setShowForm(false)}>Abbrechen</button>
              <button className="btn" onClick={submit} disabled={busy || !form.handle.trim()}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
