import React, { useEffect, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';

const CATS = [
  { key: 'reparatur', label: 'Reparatur' },
  { key: 'neu', label: 'Neu' },
  { key: 'leasing', label: 'Leasing' },
];

// Service view of the Taifun outreach list: customers whose repair is ready but
// who haven't been reached yet. Reuses the same /repairs/outreach endpoint as
// the mobile app's "Kontakte" tab.
export default function Reparaturen() {
  const toast = useToast();
  const [filter, setFilter] = useState('open'); // open | reached
  const [category, setCategory] = useState('reparatur');
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ items: [], counts: { byCategory: {}, open: 0, reached: 0 } });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ filter, category, search, scope: 'no_account' });
      setData(unwrap(await api.get(`/repairs/outreach?${q.toString()}`)));
    } catch (e) { setData({ items: [], counts: { byCategory: {}, open: 0, reached: 0 } }); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const h = setTimeout(load, 250);
    return () => clearTimeout(h);
    /* eslint-disable-next-line */
  }, [filter, category, search]);

  const setReached = async (g, reached) => {
    try {
      await api.patch(`/repairs/outreach/${encodeURIComponent(g.kdNr)}/reached`, { reached, category: g.category });
      load();
      if (reached) toast(`${g.customerName || g.kdNr} als erreicht markiert`, { undo: () => setReached(g, false) });
    } catch (e) { toast(e.message, { type: 'error' }); }
  };

  const bc = data.counts?.byCategory || {};

  return (
    <div>
      <div className="toolbar">
        {CATS.map((c) => (
          <span key={c.key} className={`pill tab ${category === c.key ? 'active' : ''}`} onClick={() => setCategory(c.key)}>
            {c.label}{bc[c.key] ? ` (${bc[c.key]})` : ''}
          </span>
        ))}
        <div className="spacer" />
        <span className="search"><input className="input" placeholder="Name, Telefon, Ort, Nr." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 240 }} /></span>
        <span className={`pill tab ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>Offen <span className="n">{data.counts?.open || 0}</span></span>
        <span className={`pill tab ${filter === 'reached' ? 'active' : ''}`} onClick={() => setFilter('reached')}>Erreicht <span className="n">{data.counts?.reached || 0}</span></span>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : (data.items || []).length === 0 ? (
        <div className="empty"><div className="big">{filter === 'open' ? '📞' : '✅'}</div>{filter === 'open' ? 'Keine offenen Kontakte.' : 'Keine erreichten Kontakte.'}</div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr><th>Kunde</th><th>Telefon</th><th>Ort</th><th>Aufträge</th><th></th></tr>
          </thead>
          <tbody>
            {data.items.map((g) => (
              <tr key={g.id} className={g.reached ? 'done' : ''}>
                <td><strong>{g.customerName || g.kdNr}</strong><div className="muted">Kd {g.kdNr}</div></td>
                <td>{g.phone || g.mobile ? <a href={`tel:${g.phone || g.mobile}`}>{g.phone || g.mobile}</a> : '—'}</td>
                <td>{[g.zip, g.city].filter(Boolean).join(' ') || '—'}</td>
                <td>
                  {(g.orders || []).map((o) => (
                    <div key={o.nr} className="muted" style={{ fontSize: 13 }}>
                      {o.info || `Auftrag ${o.nr}`}{o.appStatusLabel ? ` · ${o.appStatusLabel}` : ''}
                    </div>
                  ))}
                </td>
                <td className="right">
                  {g.reached
                    ? <button className="btn sm ghost" onClick={() => setReached(g, false)}>Zurück</button>
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
