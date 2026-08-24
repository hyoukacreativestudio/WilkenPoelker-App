import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';
import { TYPES } from './Termine.jsx';

// All customers who bought a Robby. Search across everything, add/edit/delete.
const savedHandle = () => localStorage.getItem('wp_handle') || '';
const emptyForm = () => ({ name: '', customerNumber: '', street: '', zip: '', city: '', phone: '', device: '', pin: '', purchaseDate: '', notes: '', handle: savedHandle() });

export default function RobbyKunden() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('name'); // name | customerNumber | device | city | purchaseDate
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [apptFor, setApptFor] = useState(null); // customer we're creating an appointment for
  const [apptForm, setApptForm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      setRows(unwrap(await api.get(`/desktop/robby-customers${q}`)).customers || []);
    } catch (e) { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); /* eslint-disable-next-line */ }, [search]);

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ name: r.name || '', customerNumber: r.customerNumber || '', street: r.street || '', zip: r.zip || '', city: r.city || '', phone: r.phone || '', device: r.device || '', pin: r.pin || '', purchaseDate: r.purchaseDate ? String(r.purchaseDate).slice(0, 10) : '', notes: r.notes || '', handle: savedHandle() });
    setShowForm(true);
  };
  const submit = async () => {
    if (!form.name.trim()) { toast('Name ist erforderlich', { type: 'error' }); return; }
    setBusy(true);
    try {
      if (editingId) { await api.patch(`/desktop/robby-customers/${editingId}`, form); toast('Gespeichert'); }
      else { await api.post('/desktop/robby-customers', form); toast('Kunde angelegt'); }
      setShowForm(false); setEditingId(null); setForm(emptyForm()); load();
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const del = async (r) => { if (confirm(`${r.name} löschen?`)) { try { await api.del(`/desktop/robby-customers/${r.id}`); load(); } catch (e) { toast(e.message, { type: 'error' }); } } };

  // Create a Robby appointment straight from a customer row.
  const openAppt = (r) => {
    setApptFor(r);
    setApptForm({ type: 'onsite_repair', date: '', startTime: '', endTime: '', title: r.device ? `Robby ${r.device}` : '', handle: savedHandle() });
  };
  const submitAppt = async () => {
    if (!apptForm.handle.trim()) { toast('Bitte dein Kürzel angeben', { type: 'error' }); return; }
    setBusy(true);
    try {
      await api.post('/desktop/appointments', {
        department: 'robby', type: apptForm.type, date: apptForm.date || null,
        startTime: apptForm.startTime || null, endTime: apptForm.endTime || null,
        title: apptForm.title, customerName: apptFor.name, customerNumber: apptFor.customerNumber || null,
        phone: apptFor.phone || null, handle: apptForm.handle.trim(),
      });
      toast('Termin im Robby-Kalender angelegt'); setApptFor(null); setApptForm(null);
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };

  const sorted = useMemo(() => {
    const s = String(sortKey);
    const cmp = (a, b) => {
      if (s === 'customerNumber') return String(a.customerNumber || '').localeCompare(String(b.customerNumber || ''), undefined, { numeric: true });
      if (s === 'device') return String(a.device || '').localeCompare(String(b.device || ''));
      if (s === 'city') return String(a.city || a.street || '').localeCompare(String(b.city || b.street || ''));
      if (s === 'purchaseDate') return String(b.purchaseDate || '').localeCompare(String(a.purchaseDate || '')); // newest first
      return String(a.name || '').localeCompare(String(b.name || ''));
    };
    return [...rows].sort(cmp);
  }, [rows, sortKey]);

  return (
    <div>
      <div className="toolbar no-print">
        <span className="search"><input className="input" placeholder="Suche: Name, Kd-Nr, Ort, Gerät, Pin, Datum…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 280 }} /></span>
        <select className="select" value={sortKey} onChange={(e) => setSortKey(e.target.value)} title="Sortieren">
          <option value="name">Name A–Z</option>
          <option value="customerNumber">Kundennummer</option>
          <option value="device">Gerät</option>
          <option value="city">Ort</option>
          <option value="purchaseDate">Gekauft (neueste zuerst)</option>
        </select>
        <div className="spacer" />
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
        <button className="btn" onClick={openNew}>+ Robby-Kunde</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : rows.length === 0 ? (
        <div className="empty"><div className="big">🤖</div>Keine Robby-Kunden.</div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>Name</th><th>Kd-Nr</th><th>Adresse</th><th>Telefon</th><th>Gerät</th><th>Pin</th><th>Gekauft am</th><th className="no-print"></th></tr></thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(r)}>
                <td><strong>{r.name}</strong>{r.notes ? <div className="muted" style={{ fontSize: 12 }}>{r.notes}</div> : null}</td>
                <td>{r.customerNumber || '—'}</td>
                <td>{[r.street, [r.zip, r.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'}</td>
                <td>{r.phone ? <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()}>{r.phone}</a> : '—'}</td>
                <td>{r.device || '—'}</td>
                <td>{r.pin || '—'}</td>
                <td>{r.purchaseDate ? String(r.purchaseDate).slice(0, 10) : '—'}</td>
                <td className="right no-print" onClick={(e) => e.stopPropagation()}>
                  <button className="btn sm" onClick={() => openAppt(r)} title="Termin erstellen">📅 Termin</button>{' '}
                  <button className="btn sm ghost" onClick={() => openEdit(r)}>✏️</button>{' '}
                  <button className="btn sm ghost" onClick={() => del(r)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {showForm && (
        <div className="backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Robby-Kunde bearbeiten' : 'Neuer Robby-Kunde'}</h2>
            <div className="form-grid">
              <label className="field full">Name *
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
              </label>
              <label className="field">Kundennummer
                <input className="input" value={form.customerNumber} onChange={(e) => setForm({ ...form, customerNumber: e.target.value })} />
              </label>
              <label className="field">Gerät (welcher Robby)
                <input className="input" value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} />
              </label>
              <label className="field">Pin
                <input className="input" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
              </label>
              <label className="field">Straße
                <input className="input" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
              </label>
              <label className="field">PLZ
                <input className="input" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
              </label>
              <label className="field">Ort
                <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </label>
              <label className="field">Telefon
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="field">Gekauft am
                <input className="input" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              </label>
              <label className="field full">Notiz
                <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setShowForm(false)}>Abbrechen</button>
              <button className="btn" onClick={submit} disabled={busy || !form.name.trim()}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {apptForm && apptFor && (
        <div className="backdrop" onClick={() => { setApptFor(null); setApptForm(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Termin für {apptFor.name}</h2>
            <div className="muted" style={{ marginBottom: 8 }}>{apptFor.customerNumber ? `Kd ${apptFor.customerNumber} · ` : ''}{apptFor.device || ''} → landet im Robby-Kalender</div>
            <div className="form-grid">
              <label className="field">Kürzel *
                <input className="input" value={apptForm.handle} onChange={(e) => setApptForm({ ...apptForm, handle: e.target.value })} autoFocus />
              </label>
              <label className="field">Art
                <select className="input" value={apptForm.type} onChange={(e) => setApptForm({ ...apptForm, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </label>
              <label className="field">Datum
                <input className="input" type="date" value={apptForm.date} onChange={(e) => setApptForm({ ...apptForm, date: e.target.value })} />
              </label>
              <label className="field">Uhrzeit (optional)
                <input className="input" type="time" value={apptForm.startTime} onChange={(e) => setApptForm({ ...apptForm, startTime: e.target.value })} />
              </label>
              <label className="field">Bis (optional)
                <input className="input" type="time" value={apptForm.endTime} onChange={(e) => setApptForm({ ...apptForm, endTime: e.target.value })} />
              </label>
              <label className="field full">Titel / Notiz
                <input className="input" value={apptForm.title} onChange={(e) => setApptForm({ ...apptForm, title: e.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => { setApptFor(null); setApptForm(null); }}>Abbrechen</button>
              <button className="btn" onClick={submitAppt} disabled={busy || !apptForm.handle.trim()}>Termin anlegen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
