import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { ORDER_DEPARTMENTS, departmentForRole } from '../config.js';
import { useToast } from '../toast.jsx';

const MANAGER = ['admin', 'super_admin', 'orders_manager'];
const deptLabel = (key) => ORDER_DEPARTMENTS.find((d) => d.key === key)?.label || key;
const emptyForm = { sourceText: 'Shop', link: '', articleNumber: '', description: '', customerName: '', customerNumber: '', quantity: 1, quantityForStock: 0, notes: '' };

export default function Bestellungen({ user }) {
  const toast = useToast();
  const isManager = MANAGER.includes(user.role);
  const myDept = departmentForRole(user.role);

  const [dept, setDept] = useState(isManager ? 'all' : myDept);
  const [status, setStatus] = useState('open'); // open | ordered (Erledigt)
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
      q.set('status', status);
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
      setShowForm(false); setForm(emptyForm); load(); toast('Bestellung gespeichert');
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const check = async (r, done) => { await api.patch(`/desktop/orders/${r.id}`, { status: done ? 'ordered' : 'open' }); load(); };
  const del = async (r) => { if (confirm('Bestellung löschen?')) { await api.del(`/desktop/orders/${r.id}`); load(); } };

  return (
    <div>
      <div className="toolbar no-print">
        {isManager && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`pill tab ${dept === 'all' ? 'active' : ''}`} onClick={() => setDept('all')}>Alle</span>
            {ORDER_DEPARTMENTS.map((d) => <span key={d.key} className={`pill tab ${dept === d.key ? 'active' : ''}`} onClick={() => setDept(d.key)}>{d.label}</span>)}
          </div>
        )}
        {!isManager && <span className="muted">Abteilung: <strong>{deptLabel(myDept)}</strong></span>}
        <div className="spacer" />
        <span className={`pill tab ${status === 'open' ? 'active' : ''}`} onClick={() => setStatus('open')}>Offen</span>
        <span className={`pill tab ${status === 'ordered' ? 'active' : ''}`} onClick={() => setStatus('ordered')}>Erledigt</span>
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
        <button className="btn" onClick={() => { setForm(emptyForm); setShowForm(true); }}>+ Neue Bestellung</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : sorted.length === 0 ? (
        <div className="empty"><div className="big">📦</div>{status === 'open' ? 'Keine offenen Bestellungen.' : 'Nichts erledigt.'}</div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr>
              {isManager && <th className="sortable" onClick={() => toggleSort('department')}>Abteilung{arrow('department')}</th>}
              <th className="sortable" onClick={() => toggleSort('sourceText')}>Quelle{arrow('sourceText')}</th>
              <th className="sortable" onClick={() => toggleSort('articleNumber')}>Artikel-Nr.{arrow('articleNumber')}</th>
              <th className="sortable" onClick={() => toggleSort('description')}>Was{arrow('description')}</th>
              <th className="sortable" onClick={() => toggleSort('customerName')}>Für wen{arrow('customerName')}</th>
              <th className="sortable right" onClick={() => toggleSort('quantity')}>Anzahl{arrow('quantity')}</th>
              <th className="right">Lager</th>
              <th className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className={r.status === 'ordered' ? 'done' : ''}>
                {isManager && <td>{deptLabel(r.department)}</td>}
                <td>{r.sourceText || 'Shop'}{r.link ? <div><a href={r.link} target="_blank" rel="noreferrer">🔗 Link</a></div> : null}</td>
                <td>{r.articleNumber || '—'}</td>
                <td><strong>{r.description}</strong>{r.notes ? <div className="muted">{r.notes}</div> : null}<div className="sub2">von {r.createdByName}</div></td>
                <td>{r.customerName || '—'}{r.customerNumber ? <div className="muted">Kd {r.customerNumber}</div> : null}</td>
                <td className="right">{r.quantity}</td>
                <td className="right">{r.quantityForStock || 0}</td>
                <td className="right nowrap no-print">
                  {r.status !== 'ordered'
                    ? <button className="btn sm" onClick={() => check(r, true)}>Erledigt ✓</button>
                    : <button className="btn sm ghost" onClick={() => check(r, false)}>Zurück</button>}
                  {' '}<button className="btn sm ghost" onClick={() => del(r)}>✕</button>
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
              <label className="field">Quelle (frei)
                <input className="input" value={form.sourceText} onChange={(e) => setForm({ ...form, sourceText: e.target.value })} placeholder="z. B. Shop, Amazon, Bosch…" />
              </label>
              <label className="field">Artikelnummer
                <input className="input" value={form.articleNumber} onChange={(e) => setForm({ ...form, articleNumber: e.target.value })} />
              </label>
              <label className="field full">Link (optional)
                <input className="input" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" />
              </label>
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
