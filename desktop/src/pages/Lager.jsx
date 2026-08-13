import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';

const CAN_WRITE = ['sales_manager', 'admin', 'super_admin'];
const emptyForm = { brand: '', color: '', articleNumber: '', description: '', quantity: 1, notes: '' };

export default function Lager({ user }) {
  const canWrite = CAN_WRITE.includes(user.role);
  const [status, setStatus] = useState('requested');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
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

  const submit = async () => {
    if (!form.description.trim()) return;
    setBusy(true);
    try { await api.post('/desktop/warehouse', form); setShowForm(false); setForm(emptyForm); load(); }
    catch (e) { alert(e.message); } finally { setBusy(false); }
  };
  const markBrought = async (r) => { await api.patch(`/desktop/warehouse/${r.id}`, { status: 'brought' }); load(); };
  const reopen = async (r) => { await api.patch(`/desktop/warehouse/${r.id}`, { status: 'requested' }); load(); };
  const del = async (r) => { if (confirm('Eintrag löschen?')) { await api.del(`/desktop/warehouse/${r.id}`); load(); } };

  return (
    <div>
      <div className="toolbar">
        <span className="muted">Was aus dem Lager nach vorne gebracht werden soll</span>
        <div className="spacer" />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="requested">Offen</option>
          <option value="brought">Gebracht</option>
          <option value="all">Alle</option>
        </select>
        {canWrite && <button className="btn" onClick={() => { setForm(emptyForm); setShowForm(true); }}>+ Neuer Eintrag</button>}
      </div>

      {loading ? <div className="empty">Lädt…</div> : sorted.length === 0 ? (
        <div className="empty">Keine Einträge.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('brand')}>Marke{arrow('brand')}</th>
              <th className="sortable" onClick={() => toggleSort('color')}>Farbe{arrow('color')}</th>
              <th className="sortable" onClick={() => toggleSort('articleNumber')}>Artikel-Nr.{arrow('articleNumber')}</th>
              <th className="sortable" onClick={() => toggleSort('description')}>Was{arrow('description')}</th>
              <th className="right">Anzahl</th>
              <th className="sortable" onClick={() => toggleSort('status')}>Status{arrow('status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className={r.status === 'brought' ? 'done' : ''}>
                <td><strong>{r.brand || '—'}</strong></td>
                <td>{r.color || '—'}</td>
                <td>{r.articleNumber || '—'}</td>
                <td>{r.description}<div className="muted" style={{ fontSize: 12 }}>von {r.createdByName}</div></td>
                <td className="right">{r.quantity}</td>
                <td><span className={`badge ${r.status === 'brought' ? 'brought' : 'open'}`}>{r.status === 'brought' ? 'Gebracht' : 'Offen'}</span></td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>
                  {r.status !== 'brought' ? <button className="btn sm" onClick={() => markBrought(r)}>Gebracht ✓</button> : <button className="btn sm ghost" onClick={() => reopen(r)}>Zurück</button>}
                  {' '}<button className="btn sm ghost" onClick={() => del(r)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div className="backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Neuer Lager-Eintrag</h2>
            <div className="form-grid">
              <label className="field full">Was ist es? *
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} autoFocus />
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
              <button className="btn" onClick={submit} disabled={busy || !form.description.trim()}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
