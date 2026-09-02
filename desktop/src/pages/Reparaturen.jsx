import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';
import { auftragCategoriesForRole, REPAIR_DEPARTMENT_ROLE, REPAIR_DEPARTMENTS } from '../config.js';

const CAT_LABEL = { reparatur: 'Reparatur', neu: 'Neu', leasing: 'Leasing' };
const DEPT_LABEL = { fahrrad: 'Fahrrad', robby: 'Robby', rasenmaeher: 'Rasenmäher', motorgeraete: 'Motorgeräte', elektro: 'Elektrofahrzeuge' };
const READY = ['REP_ABHOLBEREIT', 'NEU_ABHOLBEREIT', 'LEASING_ABGESCHLOSSEN'];

// Aufträge (Taifun outreach): customers to contact, split by category and by
// status (Abholbereit / In Arbeit). Sales only sees Neu + Leasing.
export default function Reparaturen({ user }) {
  const toast = useToast();
  const cats = useMemo(() => auftragCategoriesForRole(user.role), [user.role]);
  const [category, setCategory] = useState(cats[0]);
  const [statusF, setStatusF] = useState('all');   // all | ready | progress
  const [filter, setFilter] = useState('open');     // open | reached
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('name');   // name | kdnr | auftrag
  // Department roles are locked to their own repairs (one dept or several, e.g.
  // Neuradwerkstatt = Fahrrad+Elektro); Service and admins see all and pick here.
  const lockedRaw = REPAIR_DEPARTMENT_ROLE[user.role] || null;
  const lockedDepts = Array.isArray(lockedRaw) ? lockedRaw : (lockedRaw ? [lockedRaw] : null);
  const lockedDept = lockedDepts ? lockedDepts.join(',') : null;
  const [department, setDepartment] = useState('all');
  const [data, setData] = useState({ items: [], counts: { byCategory: {}, byDepartment: {}, open: 0, reached: 0 } });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ filter, category, department: lockedDept || department, search, scope: 'no_account' });
      setData(unwrap(await api.get(`/repairs/outreach?${q.toString()}`)));
    } catch (e) { setData({ items: [], counts: { byCategory: {}, byDepartment: {}, open: 0, reached: 0 } }); }
    finally { setLoading(false); }
  };
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); /* eslint-disable-next-line */ }, [filter, category, department, search]);

  const setReached = async (g, reached) => {
    try {
      await api.patch(`/repairs/outreach/${encodeURIComponent(g.kdNr)}/reached`, { reached, category: g.category });
      load();
      if (reached) toast(`${g.customerName || g.kdNr} als erreicht markiert`, { undo: () => setReached(g, false) });
    } catch (e) { toast(e.message, { type: 'error' }); }
  };

  const groupReady = (g) => (g.orders || []).some((o) => READY.includes(o.appStatus));
  const firstNr = (g) => (g.orders && g.orders[0] && g.orders[0].nr) || '';
  const items = (data.items || [])
    .filter((g) => statusF === 'all' || (statusF === 'ready' ? groupReady(g) : !groupReady(g)))
    .sort((a, b) => {
      if (sortKey === 'kdnr') return String(a.kdNr || '').localeCompare(String(b.kdNr || ''), undefined, { numeric: true });
      if (sortKey === 'auftrag') return String(firstNr(a)).localeCompare(String(firstNr(b)), undefined, { numeric: true });
      if (sortKey === 'abteilung') return String(a.department || 'zzz').localeCompare(String(b.department || 'zzz')) || String(a.customerName || '').localeCompare(String(b.customerName || ''));
      return String(a.customerName || a.kdNr || '').localeCompare(String(b.customerName || b.kdNr || ''));
    });
  const bc = data.counts?.byCategory || {};

  return (
    <div>
      <div className="toolbar no-print">
        {cats.map((c) => (
          <span key={c} className={`pill tab ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {CAT_LABEL[c]}{bc[c] ? <span className="n">{bc[c]}</span> : null}
          </span>
        ))}
        <div className="spacer" />
        <span className="search"><input className="input" placeholder="Name, Telefon, Ort, Nr." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} /></span>
        {lockedDept
          ? <span className="pill" title="Deine Abteilung(en)">{lockedDepts.map((d) => DEPT_LABEL[d] || d).join(' + ')}</span>
          : (
            <select className="select" value={department} onChange={(e) => setDepartment(e.target.value)} title="Abteilung">
              <option value="all">Alle Abteilungen</option>
              {REPAIR_DEPARTMENTS.map((d) => (
                <option key={d.key} value={d.key}>{DEPT_LABEL[d.key]}{data.counts?.byDepartment?.[d.key] ? ` (${data.counts.byDepartment[d.key]})` : ''}</option>
              ))}
            </select>
          )}
        <select className="select" value={sortKey} onChange={(e) => setSortKey(e.target.value)} title="Sortieren">
          <option value="name">Name A–Z</option>
          <option value="kdnr">Kundennummer</option>
          <option value="auftrag">Auftragsnummer</option>
          {!lockedDept ? <option value="abteilung">Abteilung</option> : null}
        </select>
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
      </div>
      <div className="toolbar no-print">
        <span className={`pill tab ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>Offen <span className="n">{data.counts?.open || 0}</span></span>
        <span className={`pill tab ${filter === 'reached' ? 'active' : ''}`} onClick={() => setFilter('reached')}>Erreicht <span className="n">{data.counts?.reached || 0}</span></span>
        <div style={{ width: 12 }} />
        {[['all', 'Alle'], ['ready', 'Abholbereit'], ['progress', 'In Arbeit']].map(([k, l]) => (
          <span key={k} className={`pill tab ${statusF === k ? 'active' : ''}`} onClick={() => setStatusF(k)}>{l}</span>
        ))}
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : items.length === 0 ? (
        <div className="empty"><div className="big">📞</div>Keine Einträge.</div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>Kunde</th><th>Telefon</th><th>Ort</th><th>Aufträge</th><th className="no-print"></th></tr></thead>
          <tbody>
            {items.map((g) => (
              <tr key={g.id} className={g.reached ? 'done' : ''}>
                <td><strong>{g.customerName || g.kdNr}</strong><div className="muted">Kd {g.kdNr}{g.department ? ` · ${DEPT_LABEL[g.department] || g.department}` : ''}</div></td>
                <td>{g.phone || g.mobile ? <a href={`tel:${g.phone || g.mobile}`}>{g.phone || g.mobile}</a> : '—'}</td>
                <td>{[g.zip, g.city].filter(Boolean).join(' ') || '—'}</td>
                <td>{(g.orders || []).map((o) => (
                  <div key={o.nr} className="muted" style={{ fontSize: 13 }}>
                    <span className={`badge ${READY.includes(o.appStatus) ? 'brought' : 'open'}`} style={{ fontSize: 11, marginRight: 6 }}>{READY.includes(o.appStatus) ? 'Abholbereit' : 'In Arbeit'}</span>
                    {o.info || `Auftrag ${o.nr}`}{o.appStatusLabel ? ` · ${o.appStatusLabel}` : ''}
                  </div>
                ))}</td>
                <td className="right no-print">
                  {g.reached ? <button className="btn sm ghost" onClick={() => setReached(g, false)}>Zurück</button>
                             : <button className="btn sm" onClick={() => setReached(g, true)}>Erreicht ✓</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
