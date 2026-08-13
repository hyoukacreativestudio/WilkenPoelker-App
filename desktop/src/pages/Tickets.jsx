import React, { useEffect, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';

// Department tickets. Uses the same /service/tickets/all endpoint as the app's
// admin ticket views. Everyone sees/handles their department's tickets.
export default function Tickets() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('open');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const q = status !== 'all' ? `?status=${status}` : '';
      const res = unwrap(await api.get(`/service/tickets/all${q}`));
      setRows(res.tickets || res.items || (Array.isArray(res) ? res : []));
    } catch (e) { setError(e.message); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const setTicketStatus = async (t, s) => {
    try { await api.put(`/service/tickets/${t.id || t._id}/status`, { status: s }); load(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  const custName = (t) => t.creator ? `${t.creator.firstName || ''} ${t.creator.lastName || ''}`.trim() : (t.customerName || '');

  return (
    <div>
      <div className="toolbar">
        <span className="muted">Tickets deiner Abteilung</span>
        <div className="spacer" />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Offen</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="closed">Geschlossen</option>
          <option value="all">Alle</option>
        </select>
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : error ? (
        <div className="empty"><div className="big">💬</div>Tickets nicht verfügbar.<div className="muted">{error}</div></div>
      ) : rows.length === 0 ? (
        <div className="empty"><div className="big">💬</div>Keine Tickets.</div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr><th>Nr.</th><th>Kunde</th><th>Titel</th><th>Kategorie</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id || t._id} className={t.status === 'closed' ? 'done' : ''}>
                <td>#{t.ticketNumber || '—'}</td>
                <td>{custName(t) || '—'}</td>
                <td>{t.title || t.type || '—'}<div className="muted" style={{ fontSize: 12 }}>{(t.description || '').slice(0, 80)}</div></td>
                <td>{t.category || t.type || '—'}</td>
                <td>{t.status || '—'}</td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>
                  {t.status !== 'closed'
                    ? <button className="btn sm" onClick={() => setTicketStatus(t, 'closed')}>Schließen</button>
                    : <button className="btn sm ghost" onClick={() => setTicketStatus(t, 'open')}>Öffnen</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
