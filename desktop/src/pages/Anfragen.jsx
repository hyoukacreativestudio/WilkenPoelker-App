import React, { useEffect, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';
import { useLiveReload } from '../customers.jsx';
import { TicketDetail } from './Tickets.jsx';

// Product inquiries for Verkauf + Admin, split by where they came from.
//  App: chat with the customer, the answer arrives in the app.
//  Website: the customer has no account and is reached by e-mail or phone.
const APP_STATUS = { open: 'Neu', in_progress: 'In Bearbeitung', confirmed: 'In Bearbeitung', completed: 'Erledigt', cancelled: 'Erledigt', closed: 'Erledigt' };
const WEB_STATUS = { new: 'Neu', in_progress: 'In Bearbeitung', done: 'Erledigt' };
const FILTERS = [
  { key: 'all', label: 'Alle' },
  { key: 'new', label: 'Neu' },
  { key: 'in_progress', label: 'In Bearbeitung' },
  { key: 'done', label: 'Erledigt' },
];
const fmt = (d) => (d ? new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const mailto = (r) => `mailto:${r.email}?subject=${encodeURIComponent(`Ihre Anfrage bei Wilken Poelker${r.productTitle ? `: ${r.productTitle}` : ''}`)}`;

export default function Anfragen() {
  const toast = useToast();
  const [source, setSource] = useState('app');
  const [status, setStatus] = useState('all');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [list, c] = await Promise.all([
        api.get(`/desktop/inquiries/${source === 'app' ? 'app' : 'website'}?status=${status}`),
        api.get('/desktop/inquiries/counts'),
      ]);
      const d = unwrap(list);
      setRows((source === 'app' ? d.tickets : d.inquiries) || []);
      setCounts(unwrap(c));
    } catch (e) { if (!silent) { toast(e.message, { type: 'error' }); setRows([]); } } finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [source, status]);
  useLiveReload(load, [source, status]);

  const setWebStatus = async (r, next) => {
    try { await api.patch(`/desktop/inquiries/website/${r.id}`, { status: next }); load(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };
  const remove = async (r) => {
    if (!window.confirm(`Anfrage von ${r.name} löschen?`)) return;
    try { await api.delete(`/desktop/inquiries/website/${r.id}`); load(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  return (
    <div>
      <div className="toolbar no-print">
        <span className={`pill tab ${source === 'app' ? 'active' : ''}`} onClick={() => setSource('app')}>📱 App{counts.app ? ` (${counts.app} neu)` : ''}</span>
        <span className={`pill tab ${source === 'website' ? 'active' : ''}`} onClick={() => setSource('website')}>🌐 Website{counts.website ? ` (${counts.website} neu)` : ''}</span>
        <div className="spacer" />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
      </div>
      <div className="muted" style={{ marginBottom: 12 }}>
        {source === 'app'
          ? 'Antworten kommen beim Kunden direkt in der App an.'
          : 'Kunde hat kein Konto: Antwort per E-Mail oder Telefon.'}
        {' '}Eine Anfrage ist keine Bestellung. Wir liefern nur im Umkreis und versenden nichts.
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : rows.length === 0 ? (
        <div className="empty"><div className="big">✉️</div>Keine Anfragen.</div>
      ) : source === 'app' ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Eingang</th><th>Kunde</th><th>Produkt</th><th>Nachricht</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className={['closed', 'completed', 'cancelled'].includes(t.status) ? 'done' : ''} style={{ cursor: 'pointer' }} onClick={() => setOpenId(t.id)}>
                <td className="nowrap">{fmt(t.createdAt)}</td>
                <td>
                  {`${t.creator?.firstName || ''} ${t.creator?.lastName || ''}`.trim() || '—'}
                  {t.creator?.customerNumber ? <div className="muted">Kd {t.creator.customerNumber}</div> : null}
                  {t.creator?.phone ? <div className="muted">☎ {t.creator.phone}</div> : null}
                </td>
                <td>{t.productTitle}{t.productArtNr ? <div className="muted">Art.-Nr. {t.productArtNr}</div> : null}</td>
                <td><div className="muted" style={{ fontSize: 13 }}>{(t.description || '').slice(0, 120)}</div></td>
                <td>{APP_STATUS[t.status] || t.status}</td>
                <td className="right"><button className="btn sm" onClick={(e) => { e.stopPropagation(); setOpenId(t.id); }}>Antworten</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>Eingang</th><th>Kunde</th><th>Produkt</th><th>Nachricht</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.status === 'done' ? 'done' : ''}>
                <td className="nowrap">{fmt(r.createdAt)}</td>
                <td>
                  {r.name}
                  <div><a href={mailto(r)} onClick={() => r.status === 'new' && setWebStatus(r, 'in_progress')}>{r.email}</a></div>
                  <div><a href={`tel:${r.phone}`}>☎ {r.phone}</a></div>
                </td>
                <td>{r.productTitle || 'Allgemeine Anfrage'}{r.artNr ? <div className="muted">Art.-Nr. {r.artNr}</div> : null}</td>
                <td style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{r.message || <span className="muted">Keine Nachricht</span>}</td>
                <td>
                  <select className="select" value={r.status} onChange={(e) => setWebStatus(r, e.target.value)}>
                    {Object.entries(WEB_STATUS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </td>
                <td className="right"><button className="btn sm ghost" onClick={() => remove(r)}>Löschen</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {openId && <TicketDetail id={openId} onClose={() => setOpenId(null)} onChanged={load} toast={toast} />}
    </div>
  );
}
