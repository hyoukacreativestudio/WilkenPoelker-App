import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { ORDER_DEPARTMENTS } from '../config.js';
import { useToast } from '../toast.jsx';

// Customer orders = orders without Rep-/VK-Nr. that got an automatic number.
// Flow: Offen -> "Teil da" -> "Erreicht" -> "Abgeholt" (then it disappears).
const MANAGER = ['admin', 'super_admin', 'orders_manager', 'service_manager'];
const STEPS = [
  { key: 'waiting', label: 'Offen', empty: 'Keine Kundenbestellungen, die auf Teile warten.', next: 'arrived', action: 'Teil da ✓' },
  { key: 'arrived', label: 'Teile da', empty: 'Keine Teile da – niemand muss angerufen werden.', next: 'reached', action: 'Erreicht ✓', prev: 'waiting' },
  { key: 'reached', label: 'Erreicht', empty: 'Keine erreichten Kunden, die noch abholen müssen.', next: 'picked_up', action: 'Abgeholt ✓', prev: 'arrived' },
];
const STEP_DONE_TEXT = { arrived: 'nach „Teile da“ verschoben', reached: 'nach „Erreicht“ verschoben', picked_up: 'als abgeholt erledigt' };
const deptLabel = (key) => ORDER_DEPARTMENTS.find((d) => d.key === key)?.label || key;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('de-DE') : '—');
const savedHandle = () => localStorage.getItem('wp_handle') || '';
const firstSet = (rows, key) => rows.map((r) => r[key]).find((v) => v) || '';

export default function Kundenbestellungen({ user }) {
  const toast = useToast();
  const isManager = MANAGER.includes(user.role);
  const [step, setStep] = useState('waiting');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyKey, setBusyKey] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = unwrap(await api.get(`/desktop/customer-orders?status=${step}`));
      setRows(data.orders || []);
    } catch (e) { setRows([]); toast(e.message, { type: 'error' }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [step]);

  // One card per customer order (all articles with the same year + number)
  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const k = `${r.customerOrderYear}-${r.customerOrderNumber}`;
      if (!map.has(k)) map.set(k, { key: k, year: r.customerOrderYear, number: r.customerOrderNumber, items: [] });
      map.get(k).items.push(r);
    });
    const q = search.trim().toLowerCase();
    return [...map.values()]
      .map((g) => ({
        ...g,
        customerName: firstSet(g.items, 'customerName'),
        customerNumber: firstSet(g.items, 'customerNumber'),
        customerPhone: firstSet(g.items, 'customerPhone'),
        department: g.items[0].department,
        handle: firstSet(g.items, 'handle'),
        createdAt: g.items[0].createdAt,
        statusAt: g.items[0].customerOrderStatusAt,
        statusBy: g.items[0].customerOrderStatusBy,
      }))
      .filter((g) => !q || [g.number, g.customerName, g.customerNumber, g.customerPhone, ...g.items.map((i) => `${i.description} ${i.articleNumber || ''} ${i.sourceText || ''}`)]
        .join(' ').toLowerCase().includes(q));
  }, [rows, search]);

  const move = async (g, status, { silent } = {}) => {
    setBusyKey(g.key);
    try {
      await api.patch(`/desktop/customer-orders/${g.year}/${g.number}`, { status, handle: savedHandle() });
      await load();
      if (!silent) {
        const from = step;
        toast(`Nr. ${g.number} ${STEP_DONE_TEXT[status] || 'zurückgestellt'}`, {
          duration: 6000,
          undo: () => move(g, from, { silent: true }),
        });
      }
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusyKey(null); }
  };

  const current = STEPS.find((s) => s.key === step);

  return (
    <div>
      <div className="toolbar no-print">
        {STEPS.map((s) => (
          <span key={s.key} className={`pill tab ${step === s.key ? 'active' : ''}`} onClick={() => setStep(s.key)}>{s.label}</span>
        ))}
        <div className="spacer" />
        <input className="input" style={{ maxWidth: 260 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen: Nr., Name, Telefon, Artikel…" />
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : groups.length === 0 ? (
        <div className="empty"><div className="big">🧾</div>{search ? 'Nichts gefunden.' : current.empty}</div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr>
              <th className="nowrap">Nr.</th>
              <th>Kunde</th>
              <th>Telefon</th>
              <th>Artikel</th>
              {isManager && <th>Abteilung</th>}
              <th>Kürzel</th>
              <th className="nowrap">Bestellt am</th>
              <th className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key}>
                <td className="nowrap">
                  <strong style={{ fontSize: 18 }}>{g.number}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>{g.year}</div>
                </td>
                <td>
                  <strong>{g.customerName || '—'}</strong>
                  {g.customerNumber ? <div className="muted">Kd {g.customerNumber}</div> : null}
                </td>
                <td className="nowrap">{g.customerPhone ? <a href={`tel:${g.customerPhone}`}>{g.customerPhone}</a> : <span className="muted">—</span>}</td>
                <td>
                  {g.items.map((i) => (
                    <div key={i.id} style={{ marginBottom: 4 }}>
                      {i.quantity > 1 ? `${i.quantity}× ` : ''}<strong>{i.description}</strong>
                      <span className="muted">
                        {i.articleNumber ? ` · ${i.articleNumber}` : ''}{i.sourceText ? ` · ${i.sourceText}` : ''}
                        {' · '}{i.status === 'ordered' ? `bestellt ${fmtDate(i.orderedAt)}` : 'noch nicht bestellt'}
                      </span>
                      {i.problemNote ? <div style={{ color: '#c53030', fontWeight: 800 }}>⚠ {i.problemNote}</div> : null}
                      {i.notes ? <div className="muted" style={{ fontSize: 12 }}>{i.notes}</div> : null}
                    </div>
                  ))}
                </td>
                {isManager && <td>{deptLabel(g.department)}</td>}
                <td>{g.handle || '—'}</td>
                <td className="nowrap">
                  {fmtDate(g.createdAt)}
                  {step !== 'waiting' && g.statusAt ? <div className="muted" style={{ fontSize: 12 }}>{current.label}: {fmtDate(g.statusAt)}{g.statusBy ? ` (${g.statusBy})` : ''}</div> : null}
                </td>
                <td className="right nowrap no-print">
                  <button className="btn sm" disabled={busyKey === g.key} onClick={() => move(g, current.next)}>{current.action}</button>
                  {current.prev ? <>{' '}<button className="btn sm ghost" disabled={busyKey === g.key} onClick={() => move(g, current.prev)} title="Einen Schritt zurück">↩</button></> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
