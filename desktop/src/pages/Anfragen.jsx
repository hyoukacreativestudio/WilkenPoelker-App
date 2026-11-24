import React, { useEffect, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';
import { useLiveReload } from '../customers.jsx';
import { CustomerName } from '../customerProfile.jsx';
import { TicketDetail } from './Tickets.jsx';

// Inquiries, split by where they came from.
//  App: chat with the customer, the answer arrives in the app (Verkauf + Admin).
//  Website: the customer has no account and is reached by e-mail or phone. Each
//  inquiry has a topic; the server sends it to the matching department
//  (Werkstatt, Fahrrad, Kärcher, Mähroboter, Motorgeräte). Verkauf and admins
//  see all of them, a department only its own.
const APP_STATUS = { open: 'Neu', in_progress: 'In Bearbeitung', confirmed: 'In Bearbeitung', completed: 'Erledigt', cancelled: 'Erledigt', closed: 'Erledigt' };
const WEB_STATUS = { new: 'Neu', in_progress: 'In Bearbeitung', done: 'Erledigt' };
const SEES_APP = ['admin', 'super_admin', 'sales_manager'];
const TOPIC_ICON = { produkt: '🛒', allgemein: '💬', werkstatt: '🛠️', ersatzteile: '🔩', fahrrad: '🚲', kaercher: '🧽', maehroboter: '🤖', rueckruf: '📞' };
// Finished inquiries leave the list and wait under "Erledigt"
const isDone = (r) => ['completed', 'cancelled', 'closed', 'done'].includes(r.status);
const fmt = (d) => (d ? new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
// Sent from the English pages of the website (/en/...): the customer wrote in English
const isEnglish = (r) => /^\/en\//.test(r.pageUrl || '');
const mailto = (r) => `mailto:${r.email}?subject=${encodeURIComponent(isEnglish(r)
  ? `Your inquiry at Wilken Poelker${r.productTitle ? `: ${r.productTitle}` : ''}`
  : `Ihre Anfrage bei Wilken Poelker${r.productTitle ? `: ${r.productTitle}` : ''}`)}`;
const telHref = (p) => `tel:${String(p || '').replace(/[^\d+]/g, '')}`;

export default function Anfragen({ user }) {
  const toast = useToast();
  const seesApp = SEES_APP.includes(user?.role);
  const [source, setSource] = useState(seesApp ? 'app' : 'website');
  const [tab, setTab] = useState('open'); // open | done
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [labels, setLabels] = useState({ topics: {}, departments: {} });
  const [topic, setTopic] = useState('');
  const [dept, setDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [list, c] = await Promise.all([
        api.get(`/desktop/inquiries/${source === 'app' ? 'app' : 'website'}?status=all`),
        api.get('/desktop/inquiries/counts'),
      ]);
      const d = unwrap(list);
      setRows((source === 'app' ? d.tickets : d.inquiries) || []);
      if (d.topics) setLabels({ topics: d.topics, departments: d.departments || {} });
      setCounts(unwrap(c));
    } catch (e) { if (!silent) { toast(e.message, { type: 'error' }); setRows([]); } } finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [source]);
  useLiveReload(load, [source]);

  const filtered = source === 'website'
    ? rows.filter((r) => (!topic || (r.topic || 'produkt') === topic) && (!dept || (r.department || 'verkauf') === dept))
    : rows;
  const openRows = filtered.filter((r) => !isDone(r));
  const doneRows = filtered.filter(isDone);
  const shown = tab === 'done' ? doneRows : openRows;
  // Only filters that make a difference in the current list
  const topicsInList = [...new Set(rows.map((r) => r.topic || 'produkt'))];
  const depsInList = [...new Set(rows.map((r) => r.department || 'verkauf'))];

  const setWebStatus = async (r, next) => {
    try { await api.patch(`/desktop/inquiries/website/${r.id}`, { status: next }); load(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };
  const remove = async (r) => {
    if (!window.confirm(`Anfrage von ${r.name} löschen?`)) return;
    try { await api.delete(`/desktop/inquiries/website/${r.id}`); load(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };
  const topicText = (r) => labels.topics[r.topic || 'produkt'] || 'Produktanfrage';

  return (
    <div>
      <div className="toolbar no-print">
        {seesApp && <span className={`pill tab ${source === 'app' ? 'active' : ''}`} onClick={() => setSource('app')}>📱 App{counts.app ? ` (${counts.app} neu)` : ''}</span>}
        <span className={`pill tab ${source === 'website' ? 'active' : ''}`} onClick={() => setSource('website')}>🌐 Website{counts.website ? ` (${counts.website} neu)` : ''}</span>
        <div style={{ width: 12 }} />
        <span className={`pill tab ${tab === 'open' ? 'active' : ''}`} onClick={() => setTab('open')}>Offen{openRows.length ? <span className="n">{openRows.length}</span> : null}</span>
        <span className={`pill tab ${tab === 'done' ? 'active' : ''}`} onClick={() => setTab('done')}>Erledigt{doneRows.length ? <span className="n">{doneRows.length}</span> : null}</span>
        {source === 'website' && topicsInList.length > 1 && (
          <select className="select" value={topic} onChange={(e) => setTopic(e.target.value)} style={{ marginLeft: 12 }}>
            <option value="">Alle Themen</option>
            {topicsInList.map((k) => <option key={k} value={k}>{labels.topics[k] || k}</option>)}
          </select>
        )}
        {source === 'website' && seesApp && depsInList.length > 1 && (
          <select className="select" value={dept} onChange={(e) => setDept(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="">Alle Abteilungen</option>
            {depsInList.map((k) => <option key={k} value={k}>{labels.departments[k] || k}</option>)}
          </select>
        )}
        <div className="spacer" />
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
      </div>
      <div className="muted" style={{ marginBottom: 12 }}>
        {source === 'app'
          ? 'Antworten kommen beim Kunden direkt in der App an.'
          : `Kunde hat kein Konto: Antwort per E-Mail oder Telefon. Rückrufbitten haben nur eine Telefonnummer.${seesApp ? '' : ' Sie sehen die Anfragen Ihrer Abteilung.'}`}
        {' '}Eine Anfrage ist keine Bestellung. Wir liefern nur im Umkreis und versenden nichts.
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : shown.length === 0 ? (
        <div className="empty"><div className="big">✉️</div>{tab === 'done' ? 'Noch keine erledigten Anfragen.' : 'Keine offenen Anfragen.'}</div>
      ) : source === 'app' ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Eingang</th><th>Kunde</th><th>Produkt</th><th>Nachricht</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(t.id)}>
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
          <thead><tr><th>Eingang</th><th>Thema</th><th>Kunde</th><th>Anliegen</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {shown.map((r) => {
              const callback = r.topic === 'rueckruf';
              return (
                <tr key={r.id}>
                  <td className="nowrap">{fmt(r.createdAt)}</td>
                  <td>
                    <span className="pill" style={callback ? { background: '#fff4e5', color: '#9a4a00', fontWeight: 600 } : undefined}>
                      {TOPIC_ICON[r.topic || 'produkt'] || '✉️'} {topicText(r)}
                    </span>
                    {isEnglish(r) ? <div style={{ marginTop: 4 }}><span className="pill" title="Von der englischen Website gesendet">Englisch: bitte auf Englisch antworten</span></div> : null}
                    {seesApp && r.department ? <div className="muted" style={{ marginTop: 4 }}>{labels.departments[r.department] || r.department}</div> : null}
                  </td>
                  <td>
                    <CustomerName name={r.name} email={r.email} phone={r.phone} />
                    <div><a href={telHref(r.phone)} style={callback ? { fontWeight: 700 } : undefined} onClick={() => callback && r.status === 'new' && setWebStatus(r, 'in_progress')}>☎ {r.phone}</a>{callback ? <span className="muted"> (bittet um Rückruf)</span> : null}</div>
                    {r.email
                      ? <div><a href={mailto(r)} onClick={() => r.status === 'new' && setWebStatus(r, 'in_progress')}>{r.email}</a></div>
                      : <div className="muted">Keine E-Mail angegeben</div>}
                  </td>
                  <td>
                    {r.productTitle ? <div style={{ fontWeight: 600 }}>{r.productTitle}{r.artNr ? <span className="muted" style={{ fontWeight: 400 }}> · Art.-Nr. {r.artNr}</span> : null}</div> : null}
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{r.message || <span className="muted">Keine Nachricht</span>}</div>
                    {r.pageUrl ? <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Gesendet von {r.pageUrl}</div> : null}
                  </td>
                  <td>
                    <select className="select" value={r.status} onChange={(e) => setWebStatus(r, e.target.value)}>
                      {Object.entries(WEB_STATUS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    </select>
                  </td>
                  <td className="right"><button className="btn sm ghost" onClick={() => remove(r)}>Löschen</button></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}

      {openId && <TicketDetail id={openId} onClose={() => setOpenId(null)} onChanged={load} toast={toast} />}
    </div>
  );
}
