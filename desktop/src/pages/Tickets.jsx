import React, { useEffect, useState } from 'react';
import { backdropHandlers } from '../backdrop.js';
import { api, unwrap, mediaUrl } from '../api.js';
import { useToast } from '../toast.jsx';
import { useLiveReload } from '../customers.jsx';

// Render image/file attachments (ticket or chat message).
function Attachments({ list }) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {list.map((a, i) => {
        const url = mediaUrl(a?.url || a);
        const isImg = (a?.mimetype || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|heic)$/i.test(url);
        if (!url) return null;
        return isImg ? (
          <a key={i} href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={a?.originalName || 'Bild'} style={{ maxWidth: 160, maxHeight: 160, borderRadius: 8, objectFit: 'cover', display: 'block' }} />
          </a>
        ) : (
          <a key={i} href={url} target="_blank" rel="noreferrer" className="btn sm ghost">📎 {a?.originalName || 'Datei'}</a>
        );
      })}
    </div>
  );
}

// Department tickets. Each department only sees its own category's tickets
// (backend-scoped). Open a ticket to read the chat, reply, and change status.
const CAT_LABEL = { bike: 'Fahrrad', cleaning: 'Reinigung', motor: 'Motor', service: 'Service' };
// Departments a ticket can be forwarded to (keys = ticket.department)
const TICKET_DEPTS = [
  { key: 'service', label: 'Service' },
  { key: 'fahrrad', label: 'Fahrrad' },
  { key: 'elektro', label: 'Neuradwerkstatt' },
  { key: 'verkauf', label: 'Verkauf' },
  { key: 'reinigung', label: 'Kärcher' },
  { key: 'rasenmaeher', label: 'Rasenmäher' },
  { key: 'motorgeraete', label: 'Motorgeräte' },
  { key: 'robby', label: 'Robby' },
  { key: 'lieferungen', label: 'Lieferungen' },
];
const STATUS_LABEL = { open: 'Offen', in_progress: 'In Bearbeitung', confirmed: 'Bestätigt', completed: 'Erledigt', cancelled: 'Storniert', closed: 'Geschlossen' };
// Closed tickets leave the list and wait under "Erledigt"
export const DONE_TICKET = ['completed', 'cancelled', 'closed'];
const isDoneTicket = (t) => DONE_TICKET.includes(t.status);

export default function Tickets() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('open'); // open | done
  const [openId, setOpenId] = useState(null);

  const load = async ({ silent = false } = {}) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const res = unwrap(await api.get('/desktop/tickets?status=all'));
      setRows(res.tickets || []);
    } catch (e) { if (!silent) { setError(e.message); setRows([]); } }
    finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useLiveReload(load, []);
  const openRows = rows.filter((t) => !isDoneTicket(t));
  const doneRows = rows.filter(isDoneTicket);
  const shown = tab === 'done' ? doneRows : openRows;

  const custName = (t) => t.creator ? `${t.creator.firstName || ''} ${t.creator.lastName || ''}`.trim() : (t.customerName || '');

  return (
    <div>
      <div className="toolbar no-print">
        <span className={`pill tab ${tab === 'open' ? 'active' : ''}`} onClick={() => setTab('open')}>Offen{openRows.length ? <span className="n">{openRows.length}</span> : null}</span>
        <span className={`pill tab ${tab === 'done' ? 'active' : ''}`} onClick={() => setTab('done')}>Erledigt{doneRows.length ? <span className="n">{doneRows.length}</span> : null}</span>
        <div className="spacer" />
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : error ? (
        <div className="empty"><div className="big">💬</div>Tickets nicht verfügbar.<div className="muted">{error}</div></div>
      ) : shown.length === 0 ? (
        <div className="empty"><div className="big">💬</div>{tab === 'done' ? 'Noch keine erledigten Tickets.' : 'Keine offenen Tickets.'}</div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr><th>Nr.</th><th>Kunde</th><th>Titel</th><th>Kategorie</th><th>Status</th><th className="no-print"></th></tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(t.id)}>
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

export function TicketDetail({ id, onClose, onChanged, toast }) {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [fwdOpen, setFwdOpen] = useState(false);
  const [fwdDept, setFwdDept] = useState('');
  const [fwdNote, setFwdNote] = useState('');

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = unwrap(await api.get(`/desktop/tickets/${id}`));
      setTicket(res.ticket); setMessages(res.messages || []);
    } catch (e) { if (!silent) { toast(e.message, { type: 'error' }); onClose(); } }
    finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  useLiveReload(load, [id]);

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

  const forward = async () => {
    if (!fwdDept) { toast('Bitte Abteilung wählen', { type: 'error' }); return; }
    setBusy(true);
    try {
      await api.post(`/desktop/tickets/${id}/forward`, { department: fwdDept, note: fwdNote.trim() || undefined });
      toast(`Ticket an ${TICKET_DEPTS.find((d) => d.key === fwdDept)?.label || fwdDept} weitergeleitet`);
      setFwdOpen(false); setFwdDept(''); setFwdNote('');
      onChanged?.();
      onClose();
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };

  const isStaff = (m) => m.sender && m.sender.role && m.sender.role !== 'customer';

  return (
    <div className="backdrop" {...backdropHandlers(onClose)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 640 }}>
        {loading || !ticket ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <>
            <h2 style={{ marginBottom: 6 }}>#{ticket.ticketNumber} · {ticket.title || ticket.type}</h2>
            <div className="muted" style={{ marginBottom: 14 }}>
              {TICKET_DEPTS.find((d) => d.key === ticket.department)?.label || CAT_LABEL[ticket.category] || ticket.category} · {STATUS_LABEL[ticket.status] || ticket.status}
              {ticket.creator ? ` · ${ticket.creator.firstName || ''} ${ticket.creator.lastName || ''}`.trimEnd() : ''}
              {ticket.creator?.customerNumber ? ` · Kd ${ticket.creator.customerNumber}` : ''}
              {ticket.creator?.phone ? ` · ☎ ${ticket.creator.phone}` : ''}
            </div>

            {/* Newer tickets carry the description as their first chat message; show the card only for older ones. */}
            {(ticket.description || (ticket.attachments || []).length)
              && !messages.some((m) => !m.isSystemMessage && m.message === ticket.description) ? (
              <div className="card" style={{ padding: 12, marginBottom: 14 }}>
                {ticket.description}
                <Attachments list={ticket.attachments} />
              </div>
            ) : null}

            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {messages.length === 0 ? <div className="muted" style={{ textAlign: 'center', padding: 12 }}>Noch keine Nachrichten.</div> : messages.map((m) => (
                m.isSystemMessage ? (
                  <div key={m.id} className="muted" style={{ textAlign: 'center', fontSize: 12 }}>{m.message}</div>
                ) : (
                  <div key={m.id} style={{ alignSelf: isStaff(m) ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                    <div className="sub2" style={{ marginBottom: 2, textAlign: isStaff(m) ? 'right' : 'left' }}>
                      {m.sender ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() || (isStaff(m) ? 'Mitarbeiter' : 'Kunde') : ''}
                    </div>
                    <div style={{ padding: '8px 12px', borderRadius: 12, background: isStaff(m) ? 'var(--dept)' : 'var(--bg-2, #eef1ee)', color: isStaff(m) ? '#fff' : 'var(--text)' }}>
                      {m.message}
                      <Attachments list={m.attachments} />
                    </div>
                  </div>
                )
              ))}
            </div>

            {/* The chat is never locked — you can always add something, even on a
                "Fertig" or closed ticket (emergency note). */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input className="input" style={{ flex: 1 }} value={reply} placeholder="Antwort schreiben…" onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
              <button className="btn" onClick={send} disabled={busy || !reply.trim()}>Senden</button>
            </div>

            {/* Forward to another department: it moves to their ticket list */}
            {fwdOpen ? (
              <div className="card" style={{ padding: 12, marginBottom: 14 }}>
                <div className="sub2" style={{ marginBottom: 6, fontWeight: 700 }}>Ticket weiterleiten an</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <select className="input" style={{ maxWidth: 220 }} value={fwdDept} onChange={(e) => setFwdDept(e.target.value)}>
                    <option value="">Abteilung wählen…</option>
                    {TICKET_DEPTS.filter((d) => d.key !== ticket.department).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                  <input className="input" style={{ flex: 1, minWidth: 180 }} value={fwdNote} placeholder="Hinweis (optional – steht im Chat, der Kunde sieht ihn auch)" onChange={(e) => setFwdNote(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button className="btn ghost" onClick={() => setFwdOpen(false)} disabled={busy}>Abbrechen</button>
                  <button className="btn" onClick={forward} disabled={busy || !fwdDept}>Weiterleiten</button>
                </div>
              </div>
            ) : null}

            <div className="modal-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!fwdOpen && <button className="btn ghost" onClick={() => setFwdOpen(true)}>Weiterleiten ➜</button>}
                {ticket.status !== 'in_progress' && ticket.status !== 'closed' && <button className="btn ghost" onClick={() => setStatus('in_progress')}>In Bearbeitung</button>}
                {/* "Fertig" marks it done but keeps it in the list + chat open */}
                {ticket.status !== 'completed' && ticket.status !== 'closed' && <button className="btn ghost" onClick={() => setStatus('completed')}>Fertig ✓</button>}
                {/* "Schließen" archives it (moves out of the active list) */}
                {ticket.status !== 'closed'
                  ? <button className="btn" onClick={() => setStatus('closed')}>Ticket schließen</button>
                  : <button className="btn ghost" onClick={() => setStatus('open')}>Wieder öffnen</button>}
              </div>
              <button className="btn ghost" onClick={onClose}>Schließen</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
