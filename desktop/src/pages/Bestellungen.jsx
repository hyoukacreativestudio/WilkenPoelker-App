import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { ORDER_DEPARTMENTS, departmentForRole } from '../config.js';
import { useToast } from '../toast.jsx';

const MANAGER = ['admin', 'super_admin', 'orders_manager'];
const deptLabel = (key) => ORDER_DEPARTMENTS.find((d) => d.key === key)?.label || key;

const emptyForm = { source: 'shop', articleNumber: '', description: '', customerName: '', customerNumber: '', quantity: 1, quantityForStock: 0, amazonLink: '', notes: '' };

export default function Bestellungen({ user }) {
  const toast = useToast();
  const isManager = MANAGER.includes(user.role);
  const myDept = departmentForRole(user.role);

  const [dept, setDept] = useState(isManager ? 'all' : myDept);
  const [status, setStatus] = useState('open');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (isManager && dept !== 'all') q.set('department', dept);
      if (status !== 'all') q.set('status', status);
      const data = unwrap(await api.get(`/desktop/orders?${q.toString()}`));
      setRows(data.orders || []);
    } catch (e) { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dept, status]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      let av = a[key] ?? '', bv = b[key] ?? '';
      if (key === 'quantity' || key === 'quantityForStock') { av = +av; bv = +bv; }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
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
    try {
      const payload = { ...form };
      if (isManager && dept !== 'all') payload.department = dept;
      await api.post('/desktop/orders', payload);
      setShowForm(false); setForm(emptyForm); load();
      toast('Bestellung gespeichert');
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };

  const markOrdered = async (row) => { await api.patch(`/desktop/orders/${row.id}`, { status: 'ordered' }); load(); };
  const reopen = async (row) => { await api.patch(`/desktop/orders/${row.id}`, { status: 'open' }); load(); };
  const del = async (row) => { if (confirm('Bestellung löschen?')) { await api.del(`/desktop/orders/${row.id}`); load(); } };

  return (
    <div>
      <div className="toolbar">
        {isManager && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`pill tab ${dept === 'all' ? 'active' : ''}`} onClick={() => setDept('all')}>Alle Abteilungen</span>
            {ORDER_DEPARTMENTS.map((d) => (
              <span key={d.key} className={`pill tab ${dept === d.key ? 'active' : ''}`} onClick={() => setDept(d.key)}>{d.label}</span>
            ))}
          </div>
        )}
        {!isManager && <span className="muted">Abteilung: <strong>{deptLabel(myDept)}</strong></span>}
        <div className="spacer" />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Offen</option>
          <option value="ordered">Bestellt</option>
          <option value="all">Alle</option>
        </select>
        <button className="btn" onClick={() => { setForm(emptyForm); setShowForm(true); }}>+ Neue Bestellung</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : sorted.length === 0 ? (
        <div className="empty"><div className="big">📦</div>Keine Bestellungen.<div className="muted">Lege mit „+ Neue Bestellung" die erste an.</div></div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr>
              {isManager && <th className="sortable" onClick={() => toggleSort('department')}>Abteilung{arrow('department')}</th>}
              <th className="sortable" onClick={() => toggleSort('articleNumber')}>Artikel-Nr.{arrow('articleNumber')}</th>
              <th className="sortable" onClick={() => toggleSort('description')}>Was{arrow('description')}</th>
              <th className="sortable" onClick={() => toggleSort('customerName')}>Für wen{arrow('customerName')}</th>
              <th className="sortable right" onClick={() => toggleSort('quantity')}>Anzahl{arrow('quantity')}</th>
              <th className="right">Lager</th>
              <th>Quelle</th>
              <th className="sortable" onClick={() => toggleSort('status')}>Status{arrow('status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className={r.status === 'ordered' ? 'done' : ''}>
                {isManager && <td>{deptLabel(r.department)}</td>}
                <td>{r.articleNumber || '—'}</td>
                <td><strong>{r.description}</strong>{r.notes ? <div className="muted">{r.notes}</div> : null}<div className="muted" style={{ fontSize: 12 }}>von {r.createdByName}</div></td>
                <td>{r.customerName || '—'}{r.customerNumber ? <div className="muted">Kd {r.customerNumber}</div> : null}</td>
                <td className="right">{r.quantity}</td>
                <td className="right">{r.quantityForStock || 0}</td>
                <td>{r.source === 'amazon' ? <a href={r.amazonLink} target="_blank" rel="noreferrer"><span className="badge amazon">Amazon ↗</span></a> : 'Shop'}</td>
                <td><span className={`badge ${r.status}`}>{r.status === 'ordered' ? 'Bestellt' : r.status === 'cancelled' ? 'Storniert' : 'Offen'}</span></td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>
                  {isManager && r.status !== 'ordered' && <button className="btn sm" onClick={() => markOrdered(r)}>Bestellt ✓</button>}
                  {isManager && r.status === 'ordered' && <button className="btn sm ghost" onClick={() => reopen(r)}>Zurück</button>}
                  {' '}
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
            <h2>Neue Bestellung{isManager && dept !== 'all' ? ` – ${deptLabel(dept)}` : ''}</h2>
            <div className="form-grid">
              <label className="field full">Was ist es? *
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} autoFocus />
              </label>
              <label className="field">Artikelnummer
                <input className="input" value={form.articleNumber} onChange={(e) => setForm({ ...form, articleNumber: e.target.value })} />
              </label>
              <label className="field">Quelle
                <select className="select" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="shop">Shop / Lieferant</option>
                  <option value="amazon">Amazon</option>
                </select>
              </label>
              {form.source === 'amazon' && (
                <label className="field full">Amazon-Link
                  <input className="input" value={form.amazonLink} onChange={(e) => setForm({ ...form, amazonLink: e.target.value })} placeholder="https://amazon.de/…" />
                </label>
              )}
              <label className="field">Kundenname
                <input className="input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </label>
              <label className="field">Kundennummer
                <input className="input" value={form.customerNumber} onChange={(e) => setForm({ ...form, customerNumber: e.target.value })} />
              </label>
              <label className="field">Anzahl
                <input className="input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </label>
              <label className="field">davon fürs Lager
                <input className="input" type="number" min="0" value={form.quantityForStock} onChange={(e) => setForm({ ...form, quantityForStock: e.target.value })} />
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
