import React, { useEffect, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';

// What people write under "Mehr" -> "Feedback" in the app. Admins only.
const fmt = (d) => new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function Feedback() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setRows(unwrap(await api.get('/desktop/feedback')).feedback || []); }
    catch (e) { toast(e.message, { type: 'error' }); setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const setRead = async (r, read) => {
    try { await api.patch(`/desktop/feedback/${r.id}`, { read }); setRows((l) => l.map((x) => (x.id === r.id ? { ...x, read } : x))); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };
  const remove = async (r) => {
    if (!window.confirm('Dieses Feedback löschen?')) return;
    try { await api.delete(`/desktop/feedback/${r.id}`); setRows((l) => l.filter((x) => x.id !== r.id)); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  const unread = rows.filter((r) => !r.read).length;
  return (
    <div>
      <div className="toolbar no-print">
        <span className="muted">{rows.length} Einträge{unread ? `, ${unread} neu` : ''}. Nur der Admin sieht diese Seite.</span>
        <div className="spacer" />
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
      </div>
      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : rows.length === 0 ? (
        <div className="empty"><div className="big">💡</div>Noch kein Feedback.</div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>Eingang</th><th>Von</th><th>Feedback</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.read ? 'done' : ''}>
                <td className="nowrap">{fmt(r.createdAt)}</td>
                <td>
                  {`${r.author?.firstName || ''} ${r.author?.lastName || ''}`.trim() || 'Unbekannt'}
                  {r.author?.customerNumber ? <div className="muted">Kd {r.author.customerNumber}</div> : null}
                  {r.author?.email ? <div><a href={`mailto:${r.author.email}`}>{r.author.email}</a></div> : null}
                </td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{r.message}</td>
                <td className="right nowrap">
                  <button className="btn sm ghost" onClick={() => setRead(r, !r.read)}>{r.read ? 'Als neu' : 'Gelesen'}</button>{' '}
                  <button className="btn sm ghost" onClick={() => remove(r)}>Löschen</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
