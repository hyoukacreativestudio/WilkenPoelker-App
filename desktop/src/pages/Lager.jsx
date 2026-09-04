import React, { useEffect, useMemo, useState } from 'react';
import { backdropHandlers } from '../backdrop.js';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';

const CAN_WRITE = ['sales_manager', 'admin', 'super_admin'];
const savedHandle = () => localStorage.getItem('wp_handle') || '';
const emptyForm = () => ({ brand: '', color: '', articleNumber: '', frameSize: '', model: '', quantity: 1, notes: '', handle: savedHandle() });

export default function Lager({ user }) {
  const toast = useToast();
  const canWrite = CAN_WRITE.includes(user.role);
  const [status, setStatus] = useState('requested');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const q = status !== 'all' ? `?status=${status}` : '';
      const data = unwrap(await api.get(`/desktop/warehouse${q}`));
      setRows(data.items || []);
    } catch (e) { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      const av = String(a[key] ?? '').toLowerCase(), bv = String(b[key] ?? '').toLowerCase();
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sort]);
  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const arrow = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ brand: r.brand || '', color: r.color || '', articleNumber: r.articleNumber || '', frameSize: r.frameSize || '', model: r.model || '', quantity: r.quantity ?? 1, notes: r.notes || '', handle: r.handle || savedHandle() });
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.handle.trim()) { toast('Bitte dein Kürzel angeben', { type: 'error' }); return; }
    setBusy(true);
    try {
      localStorage.setItem('wp_handle', form.handle.trim());
      if (editingId) { await api.patch(`/desktop/warehouse/${editingId}`, form); toast('Gespeichert'); }
      else { await api.post('/desktop/warehouse', form); toast('Eintrag gespeichert'); }
      setShowForm(false); setEditingId(null); setForm(emptyForm()); load();
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const setItemStatus = async (r, s) => { try { await api.patch(`/desktop/warehouse/${r.id}`, { status: s }); load(); } catch (e) { toast(e.message, { type: 'error' }); } };
  const markBrought = (r) => setItemStatus(r, 'brought');
  const markProgress = (r) => setItemStatus(r, 'in_progress');
  const reopen = (r) => setItemStatus(r, 'requested');
  const del = async (r) => { if (confirm('Eintrag löschen?')) { try { await api.del(`/desktop/warehouse/${r.id}`); load(); } catch (e) { toast(e.message, { type: 'error' }); } } };

  return (
    <div>
      <div className="toolbar no-print">
        <span className="muted">Was aus dem Lager nach vorne gebracht werden soll</span>
        <div className="spacer" />
        <span className={`pill tab ${status === 'requested' ? 'active' : ''}`} onClick={() => setStatus('requested')}>Offen</span>
        <span className={`pill tab ${status === 'in_progress' ? 'active' : ''}`} onClick={() => setStatus('in_progress')}>In Bearbeitung</span>
        <span className={`pill tab ${status === 'brought' ? 'active' : ''}`} onClick={() => setStatus('brought')}>Erledigt</span>
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
        {canWrite && <button className="btn" onClick={openNew}>+ Neuer Eintrag</button>}
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : sorted.length === 0 ? (
        <div className="empty"><div className="big">🏬</div>Keine Einträge.</div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('brand')}>Marke{arrow('brand')}</th>
              <th className="sortable" onClick={() => toggleSort('color')}>Farbe{arrow('color')}</th>
              <th className="sortable" onClick={() => toggleSort('articleNumber')}>Artikel-Nr.{arrow('articleNumber')}</th>
              <th className="sortable" onClick={() => toggleSort('model')}>Modell{arrow('model')}</th>
              <th className="sortable" onClick={() => toggleSort('frameSize')}>Rahmengröße{arrow('frameSize')}</th>
              <th className="right">Anzahl</th>
              <th className="sortable" onClick={() => toggleSort('handle')}>Kürzel{arrow('handle')}</th>
              <th className="sortable" onClick={() => toggleSort('status')}>Status{arrow('status')}</th>
              <th className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className={r.status === 'brought' ? 'done' : ''}>
                <td><strong>{r.brand || '—'}</strong></td>
                <td>{r.color || '—'}</td>
                <td>{r.articleNumber || '—'}</td>
                <td>{r.model || '—'}{r.notes ? <div className="muted" style={{ fontSize: 12 }}>{r.notes}</div> : null}</td>
                <td>{r.frameSize || '—'}</td>
                <td className="right">{r.quantity}</td>
                <td>{r.handle || '—'}</td>
                <td><span className={`badge ${r.status === 'brought' ? 'brought' : 'open'}`} style={r.status === 'in_progress' ? { background: '#fff6e0', color: '#97650a' } : undefined}>{r.status === 'brought' ? 'Gebracht' : r.status === 'in_progress' ? 'In Bearbeitung' : 'Offen'}</span></td>
                <td className="right nowrap no-print">
                  {r.status === 'requested' ? <><button className="btn sm ghost" onClick={() => markProgress(r)}>In Bearbeitung</button>{' '}<button className="btn sm" onClick={() => markBrought(r)}>Gebracht ✓</button></> : null}
                  {r.status === 'in_progress' ? <><button className="btn sm" onClick={() => markBrought(r)}>Gebracht ✓</button>{' '}<button className="btn sm ghost" onClick={() => reopen(r)}>Zurück</button></> : null}
                  {r.status === 'brought' ? <button className="btn sm ghost" onClick={() => reopen(r)}>Zurück</button> : null}
                  {canWrite && <>{' '}<button className="btn sm ghost" onClick={() => openEdit(r)}>✏️</button></>}
                  {' '}<button className="btn sm ghost" onClick={() => del(r)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {showForm && (
        <div className="backdrop" {...backdropHandlers(() => setShowForm(false))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Lager-Eintrag bearbeiten' : 'Neuer Lager-Eintrag'}</h2>
            <div className="form-grid">
              <label className="field">Dein Kürzel *
                <input className="input" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="z. B. MK" autoFocus />
              </label>
              <label className="field">Modell
                <input className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </label>
              <label className="field">Rahmengröße
                <input className="input" value={form.frameSize} onChange={(e) => setForm({ ...form, frameSize: e.target.value })} />
              </label>
              <label className="field">Marke
                <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </label>
              <label className="field">Farbe
                <input className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </label>
              <label className="field">Artikelnummer
                <input className="input" value={form.articleNumber} onChange={(e) => setForm({ ...form, articleNumber: e.target.value })} />
              </label>
              <label className="field">Anzahl
                <input className="input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </label>
              <label className="field full">Notiz
                <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
