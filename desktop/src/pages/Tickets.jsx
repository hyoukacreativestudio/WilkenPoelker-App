import React, { useEffect, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';

// Department tickets. Each department only sees its own category's tickets
// (backend-scoped). Open a ticket to read the chat, reply, and change status.
const CAT_LABEL = { bike: 'Fahrrad', cleaning: 'Reinigung', motor: 'Motor', service: 'Service' };
const STATUS_LABEL = { open: 'Offen', in_progress: 'In Bearbeitung', confirmed: 'Bestätigt', completed: 'Erledigt', cancelled: 'Storniert', closed: 'Geschlossen' };

export default function Tickets() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('open');
  const [openId, setOpenId] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const q = status !== 'all' ? `?status=${status}` : '';
      const res = unwrap(await api.get(`/desktop/tickets${q}`));
      setRows(res.tickets || []);
    } catch (e) { setError(e.message); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const custName = (t) => t.creator ? `${t.creator.firstName || ''} ${t.creator.lastName || ''}`.trim() : (t.customerName || '');

  return (
    <div>
      <div className="toolbar no-print">
        <span className="muted">Tickets deiner Abteilung</span>
        <div className="spacer" />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Offen</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="closed">Geschlossen</option>
          <option value="all">Alle</option>
        </select>
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : error ? (
        <div className="empty"><div className="big">💬</div>Tickets nicht verfügbar.<div className="muted">{error}</div></div>
      ) : rows.length === 0 ? (
        <div className="empty"><div className="big">💬</div>Keine Tickets.</div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr><th>Nr.</th><th>Kunde</th><th>Titel</th><th>Kategorie</th><th>Status</th><th className="no-print"></th></tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className={['closed', 'completed', 'cancelled'].includes(t.status) ? 'done' : ''} style={{ cursor: 'pointer' }} onClick={() => setOpenId(t.id)}>
                <td>#{t.ticketNumber || '—'}</td>
                <td>{custName(t) || '—'}{t.creator?.customerNumber ? <div className="muted">Kd {t.creator.customerNumber}</div> : null}</td>
                <td>{t.title || t.type || '—'}<div className="muted" style={{ fontSize: 12 }}>{(t.description || '').slice(0, 80)}</div></td>
                <td>{CAT_LABEL[t.category] || t.category || '—'}</td>
                <td>{STATUS_LABEL[t.status] || t.status || '—'}</td>
                <td className="right no-print"><button className="btn sm ghost" onClick={(e) => { e.stopPropagation(); setOpenId(t.id); }}>Öffnen</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {openId && <TicketDetail id={openId} onClose={() => setOpenId(null)} onChanged={load} toast={toast} />}
    </div>
  );
}

function TicketDetail({ id, onClose, onChanged, toast }) {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = unwrap(await api.get(`/desktop/tickets/${id}`));
      setTicket(res.ticket); setMessages(res.messages || []);
    } catch (e) { toast(e.message, { type: 'error' }); onClose(); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try { await api.post(`/desktop/tickets/${id}/message`, { message: reply }); setReply(''); await load(); onChanged?.(); }
    catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const setStatus = async (s) => {
    try { await api.patch(`/desktop/tickets/${id}`, { status: s }); await load(); onChanged?.(); toast('Status aktualisiert'); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  const isStaff = (m) => m.sender && m.sender.role && m.sender.role !== 'customer';

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 640 }}>
        {loading || !ticket ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <>
            <h2 style={{ marginBottom: 6 }}>#{ticket.ticketNumber} · {ticket.title || ticket.type}</h2>
            <div className="muted" style={{ marginBottom: 14 }}>
              {CAT_LABEL[ticket.category] || ticket.category} · {STATUS_LABEL[ticket.status] || ticket.status}
              {ticket.creator ? ` · ${ticket.creator.firstName || ''} ${ticket.creator.lastName || ''}`.trimEnd() : ''}
              {ticket.creator?.customerNumber ? ` · Kd ${ticket.creator.customerNumber}` : ''}
              {ticket.creator?.phone ? ` · ☎ ${ticket.creator.phone}` : ''}
            </div>

            {ticket.description ? <div className="card" style={{ padding: 12, marginBottom: 14 }}>{ticket.description}</div> : null}

            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {messages.length === 0 ? <div className="muted" style={{ textAlign: 'center', padding: 12 }}>Noch keine Nachrichten.</div> : messages.map((m) => (
                m.isSystemMessage ? (
                  <div key={m.id} className="muted" style={{ textAlign: 'center', fontSize: 12 }}>{m.message}</div>
                ) : (
                  <div key={m.id} style={{ alignSelf: isStaff(m) ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                    <div className="sub2" style={{ marginBottom: 2, textAlign: isStaff(m) ? 'right' : 'left' }}>
                      {m.sender ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() || (isStaff(m) ? 'Mitarbeiter' : 'Kunde') : ''}
                    </div>
                    <div style={{ padding: '8px 12px', borderRadius: 12, background: isStaff(m) ? 'var(--dept)' : 'var(--bg-2, #eef1ee)', color: isStaff(m) ? '#fff' : 'var(--text)' }}>{m.message}</div>
                  </div>
                )
              ))}
            </div>

            {!['closed', 'completed', 'cancelled'].includes(ticket.status) ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input className="input" style={{ flex: 1 }} value={reply} placeholder="Antwort schreiben…" onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
                <button className="btn" onClick={send} disabled={busy || !reply.trim()}>Senden</button>
              </div>
            ) : <div className="muted" style={{ marginBottom: 14 }}>Ticket ist geschlossen – zum Antworten erst wieder öffnen.</div>}

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {ticket.status !== 'in_progress' && !['closed', 'completed', 'cancelled'].includes(ticket.status) && <button className="btn ghost" onClick={() => setStatus('in_progress')}>In Bearbeitung</button>}
                {['closed', 'completed', 'cancelled'].includes(ticket.status)
                  ? <button className="btn ghost" onClick={() => setStatus('open')}>Wieder öffnen</button>
                  : <button className="btn" onClick={() => setStatus('closed')}>Schließen ✓</button>}
              </div>
              <button className="btn ghost" onClick={onClose}>Fertig</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
