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
  const filtered = useMemo(() => rows.filter((a) => status === 'all' || a.status === status), [rows, status]);
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
      <div className="toolbar">
        <span className="muted">Termine aus der App – automatisch eingetragen</span>
        <div className="spacer" />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Alle</option>
          <option value="pending">Offen</option>
          <option value="confirmed">Bestätigt</option>
          <option value="completed">Erledigt</option>
          <option value="cancelled">Storniert</option>
        </select>
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
      </div>

      {loading ? <div className="empty">Lädt…</div> : error ? (
        <div className="empty">Termine konnten nicht geladen werden.<div className="muted">{error}</div></div>
      ) : sorted.length === 0 ? (
        <div className="empty">Keine Termine.</div>
      ) : (
        <table>
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
        </table>
      )}
    </div>
  );
}
