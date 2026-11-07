import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';
import { backdropHandlers } from '../backdrop.js';
import { AppTabs, useLiveReload, whatsappNumber, kvaText, WhatsAppButton, SALUTATION } from '../customers.jsx';

const DEPT_LABEL = { fahrrad: 'Fahrrad', robby: 'Robby', rasenmaeher: 'Rasenmäher', motorgeraete: 'Motorgeräte', elektro: 'Elektrofahrzeuge' };
const RESPONSE = {
  accepted: { label: '✅ Bestätigt', cls: 'brought' },
  declined: { label: '❌ Abgelehnt', cls: 'open' },
  call: { label: '📞 Bitte anrufen', cls: 'open' },
};
const when = (d) => (d ? new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

// What the app customer gets by default; staff add the amount before sending.
const appMessage = () => `${SALUTATION}\n\nfür Ihre Reparatur haben wir einen Kostenvoranschlag erstellt: ___ €.\n\nBitte bestätigen oder lehnen Sie ihn direkt hier in der App ab, oder rufen Sie uns an (04952 5304).\n\nViele Grüße\nIhr Team von Wilken Poelker`;

// Service: every order with a cost estimate (Taifun "Reparatur KVA erstellt").
// Without app: WhatsApp with a ready text. With app: write the customer
// directly; the answer (bestätigt / abgelehnt / anrufen) appears here.
export default function Kva() {
  const toast = useToast();
  const [scope, setScope] = useState('no_app');
  const [data, setData] = useState({ items: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [compose, setCompose] = useState(null); // { row, text }
  const [busy, setBusy] = useState(false);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try { setData(unwrap(await api.get('/repairs/kva'))); }
    catch (e) { if (!silent) { setData({ items: [], counts: {} }); toast(e.message, { type: 'error' }); } }
    finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useLiveReload(load, []);

  const setContacted = async (r, contacted) => {
    try { await api.patch(`/repairs/kva/${encodeURIComponent(r.nr)}/contacted`, { contacted }); load({ silent: true }); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  const send = async () => {
    if (!compose.text.trim()) return;
    if (compose.text.includes('___')) { toast('Bitte den Betrag statt ___ eintragen', { type: 'error' }); return; }
    setBusy(true);
    try {
      await api.post(`/repairs/kva/${encodeURIComponent(compose.row.nr)}/message`, { text: compose.text.trim() });
      toast(`Nachricht an ${compose.row.customerName || 'den Kunden'} gesendet`);
      setCompose(null); load({ silent: true });
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.items || [])
      .filter((r) => (scope === 'app' ? r.hasApp : !r.hasApp))
      .filter((r) => !q || [r.customerName, r.kdNr, r.nr, r.info, r.phone, r.mobile, r.city].filter(Boolean).join(' ').toLowerCase().includes(q))
      // Answers and not yet contacted first, then the oldest
      .sort((a, b) => (!!b.response - !!a.response) || (!!a.contactedAt - !!b.contactedAt) || String(a.date || '').localeCompare(String(b.date || '')));
  }, [data, scope, search]);

  return (
    <div>
      <div className="toolbar no-print">
        <AppTabs value={scope} onChange={setScope} counts={{ no_app: data.counts?.noApp, app: data.counts?.app }} />
        <div className="spacer" />
        <input className="input" placeholder="Name, Telefon, Nr." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} />
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
      </div>
      <div className="muted no-print" style={{ marginBottom: 10, fontSize: 13 }}>
        {scope === 'app'
          ? 'Kunden mit App: Nachricht schreiben – der Kunde kann den KVA in der App bestätigen, ablehnen oder anrufen. Den Stand in Taifun stellt ihr danach selbst um.'
          : 'Kunden ohne App: WhatsApp öffnet sich mit fertigem Text. Danach steht der Auftrag auf „angeschrieben“.'}
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : rows.length === 0 ? (
        <div className="empty"><div className="big">🧾</div>Keine offenen Kostenvoranschläge.</div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>Kunde</th><th>Telefon</th><th>Auftrag</th><th>Stand</th><th className="no-print"></th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const wa = whatsappNumber(r.mobile, r.phone);
              const tel = r.mobile || r.phone;
              return (
                <tr key={r.nr} className={r.contactedAt && !r.response ? 'done' : ''}>
                  <td><strong>{r.customerName || r.kdNr}</strong><div className="muted">Kd {r.kdNr}{r.department ? ` · ${DEPT_LABEL[r.department] || r.department}` : ''}{r.city ? ` · ${r.city}` : ''}</div></td>
                  <td>{tel ? <a href={`tel:${tel}`}>{tel}</a> : '—'}</td>
                  <td>{r.info || `Auftrag ${r.nr}`}<div className="muted" style={{ fontSize: 12 }}>Nr. {r.nr}{r.date ? ` · ${new Date(r.date).toLocaleDateString('de-DE')}` : ''}</div></td>
                  <td>
                    {r.response ? <span className={`badge ${RESPONSE[r.response]?.cls || 'open'}`}>{RESPONSE[r.response]?.label || r.response}</span> : null}
                    {r.response ? <div className="muted" style={{ fontSize: 12 }}>{when(r.respondedAt)}</div> : null}
                    {!r.response && r.contactedAt ? <span className="muted">Angeschrieben {when(r.contactedAt)}</span> : null}
                    {!r.response && !r.contactedAt ? <span className="badge open">Noch nicht gemeldet</span> : null}
                    {r.message ? <div className="muted" style={{ fontSize: 12, marginTop: 4, whiteSpace: 'pre-wrap', maxWidth: 320 }} title={r.message}>✉️ {r.message.length > 90 ? `${r.message.slice(0, 90)}…` : r.message}</div> : null}
                  </td>
                  <td className="right no-print" style={{ whiteSpace: 'nowrap' }}>
                    {r.hasApp ? (
                      <button className="btn sm" onClick={() => setCompose({ row: r, text: r.message || appMessage() })}>✉️ Nachricht</button>
                    ) : (
                      <>
                        <WhatsAppButton number={wa} text={kvaText()} onSent={() => setContacted(r, true)} />{' '}
                        {r.contactedAt
                          ? <button className="btn sm ghost" onClick={() => setContacted(r, false)}>Zurück</button>
                          : <button className="btn sm ghost" onClick={() => setContacted(r, true)} title="z. B. nach einem Anruf">Angeschrieben ✓</button>}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}

      {compose ? (
        <div className="backdrop" {...backdropHandlers(() => setCompose(null))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Nachricht an {compose.row.customerName || `Kd ${compose.row.kdNr}`}</h2>
            <div className="muted" style={{ marginBottom: 8 }}>Kommt als Benachrichtigung aufs Handy und steht beim Auftrag in der App.</div>
            <textarea className="input" rows={9} style={{ width: '100%', resize: 'vertical' }} value={compose.text} onChange={(e) => setCompose({ ...compose, text: e.target.value })} />
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setCompose(null)}>Abbrechen</button>
              <button className="btn" disabled={busy || !compose.text.trim()} onClick={send}>{busy ? 'Sende…' : 'Senden'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
