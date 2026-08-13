import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';

// Customer-number requests. Admin/Service/Verkauf can view, assign a number
// (approve) or reject. Talks to the same /api/customer-number endpoints as the app.
const STATUS_LABEL = { pending: 'Offen', approved: 'Zugewiesen', rejected: 'Abgelehnt' };

export default function Kundennummern() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending');
  const [detail, setDetail] = useState(null);
  const [number, setNumber] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = unwrap(await api.get(`/customer-number/requests?status=${status}`));
      setRows(res.requests || []);
    } catch (e) { setError(e.message); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const name = (r) => r.requester ? `${r.requester.firstName || ''} ${r.requester.lastName || ''}`.trim() || r.requester.username : '—';
  const addr = (r) => { const a = r.address || {}; return [a.street, [a.zip, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', '); };

  const openDetail = (r) => { setDetail(r); setNumber(r.assignedCustomerNumber || ''); setNote(''); };

  const approve = async () => {
    if (!number.trim()) { toast('Bitte Kundennummer eingeben', { type: 'error' }); return; }
    setBusy(true);
    try { await api.put(`/customer-number/requests/${detail.id}/approve`, { customerNumber: number.trim() }); setDetail(null); load(); toast('Kundennummer zugewiesen'); }
    catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const reject = async () => {
    setBusy(true);
    try { await api.put(`/customer-number/requests/${detail.id}/reject`, { note: note.trim() || undefined }); setDetail(null); load(); toast('Anfrage abgelehnt'); }
    catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="toolbar no-print">
        <span className="muted">Kundennummer-Anfragen aus der App</span>
        <div className="spacer" />
        <span className={`pill tab ${status === 'pending' ? 'active' : ''}`} onClick={() => setStatus('pending')}>Offen</span>
        <span className={`pill tab ${status === 'approved' ? 'active' : ''}`} onClick={() => setStatus('approved')}>Zugewiesen</span>
        <span className={`pill tab ${status === 'rejected' ? 'active' : ''}`} onClick={() => setStatus('rejected')}>Abgelehnt</span>
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : error ? (
        <div className="empty"><div className="big">🔢</div>Nicht verfügbar.<div className="muted">{error}</div></div>
      ) : rows.length === 0 ? (
        <div className="empty"><div className="big">🔢</div>Keine Anfragen.</div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr><th>Kunde</th><th>Kontakt</th><th>Adresse</th><th>Bestandskunde</th><th>Status</th><th className="no-print"></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(r)}>
                <td><strong>{name(r)}</strong>{r.requester?.email ? <div className="muted">{r.requester.email}</div> : null}</td>
                <td>{r.phone || r.requester?.phone || '—'}</td>
                <td>{addr(r) || '—'}</td>
                <td>{r.isExistingCustomer ? 'Ja' : 'Nein'}</td>
                <td>{STATUS_LABEL[r.status] || r.status}{r.assignedCustomerNumber ? <div className="muted">Kd {r.assignedCustomerNumber}</div> : null}</td>
                <td className="right no-print"><button className="btn sm ghost" onClick={(e) => { e.stopPropagation(); openDetail(r); }}>Öffnen</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {detail && (
        <div className="backdrop" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Kundennummer-Anfrage</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 12px', fontSize: 14, marginBottom: 14 }}>
              <span className="muted">Kunde</span><span><strong>{name(detail)}</strong></span>
              <span className="muted">E-Mail</span><span>{detail.requester?.email || '—'}</span>
              <span className="muted">Telefon</span><span>{detail.phone || detail.requester?.phone || '—'}</span>
              <span className="muted">Adresse</span><span>{addr(detail) || '—'}</span>
              <span className="muted">Bestandskunde</span><span>{detail.isExistingCustomer ? 'Ja' : 'Nein'}</span>
              {detail.message ? <><span className="muted">Nachricht</span><span>{detail.message}</span></> : null}
              <span className="muted">Status</span><span>{STATUS_LABEL[detail.status] || detail.status}</span>
            </div>

            {detail.status === 'pending' ? (
              <>
                <label className="field full">Kundennummer zuweisen
                  <input className="input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="z. B. 2042" autoFocus />
                </label>
                <label className="field full" style={{ marginTop: 10 }}>Ablehnungsgrund (optional)
                  <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                  <button className="btn ghost" onClick={reject} disabled={busy}>Ablehnen</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn ghost" onClick={() => setDetail(null)}>Schließen</button>
                    <button className="btn" onClick={approve} disabled={busy || !number.trim()}>Zuweisen ✓</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="modal-actions"><button className="btn ghost" onClick={() => setDetail(null)}>Schließen</button></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
