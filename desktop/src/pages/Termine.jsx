import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';

// Appointments created in the app show up here automatically (same backend).
// Sortable by date, customer, repair/appointment number, type.
export default function Termine() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState({ key: 'date', dir: 'asc' });
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = unwrap(await api.get('/appointments'));
      const list = res.appointments || res.items || (Array.isArray(res) ? res : []);
      setRows(list);
    } catch (e) { setError(e.message); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const custName = (a) => a.customer ? `${a.customer.firstName || ''} ${a.customer.lastName || ''}`.trim() : (a.customerName || '');
  // Hide appointments more than 24h in the past
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const filtered = useMemo(
    () => rows.filter((a) =>
      (status === 'all' || a.status === status) &&
      (type === 'all' || a.type === type) &&
      (!a.date || String(a.date).slice(0, 10) >= cutoff)),
    [rows, status, type, cutoff]
  );
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      let av, bv;
      if (key === 'customer') { av = custName(a).toLowerCase(); bv = custName(b).toLowerCase(); }
      else { av = String(a[key] ?? '').toLowerCase(); bv = String(b[key] ?? '').toLowerCase(); }
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort]);
  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const arrow = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <div>
      <div className="toolbar no-print">
        <span className="muted">Termine aus der App – automatisch eingetragen</span>
        <div className="spacer" />
        <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">Alle Arten</option>
          <option value="repair">Reparatur</option>
          <option value="pickup">Abholung</option>
          <option value="delivery">Lieferung</option>
          <option value="inspection">Inspektion</option>
          <option value="consultation">Beratung</option>
          <option value="service">Service</option>
          <option value="other">Sonstiges</option>
        </select>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Alle Status</option>
          <option value="pending">Offen</option>
          <option value="confirmed">Bestätigt</option>
          <option value="completed">Erledigt</option>
          <option value="cancelled">Storniert</option>
        </select>
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
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
              <th className="sortable" onClick={() => toggleSort('customer')}>Kunde{arrow('customer')}</th>
              <th className="sortable" onClick={() => toggleSort('title')}>Titel{arrow('title')}</th>
              <th className="sortable" onClick={() => toggleSort('type')}>Art{arrow('type')}</th>
              <th className="sortable" onClick={() => toggleSort('status')}>Status{arrow('status')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id || a._id}>
                <td>{a.date || '—'}</td>
                <td>{a.startTime || ''}</td>
                <td>{custName(a) || '—'}{a.customer?.customerNumber ? <div className="muted">Kd {a.customer.customerNumber}</div> : null}</td>
                <td>{a.title || '—'}</td>
                <td>{a.type || '—'}</td>
                <td>{a.status || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
