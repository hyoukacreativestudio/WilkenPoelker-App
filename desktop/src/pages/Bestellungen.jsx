import React, { useEffect, useMemo, useState } from 'react';
import { backdropHandlers } from '../backdrop.js';
import { api, unwrap } from '../api.js';
import { ORDER_DEPARTMENTS, departmentForRole } from '../config.js';
// (unwrap used for the purge response)
import { useToast } from '../toast.jsx';

// Service acts exactly like the Bestellungen account for orders (see all, edit,
// tick off).
const MANAGER = ['admin', 'super_admin', 'orders_manager', 'service_manager'];
const CHECKOFF = ['admin', 'super_admin', 'orders_manager', 'service_manager'];
const deptLabel = (key) => ORDER_DEPARTMENTS.find((d) => d.key === key)?.label || key;
const savedHandle = () => localStorage.getItem('wp_handle') || '';
const emptyForm = () => ({ sourceText: 'Shop', link: '', articleNumber: '', description: '', customerName: '', customerNumber: '', quantity: 1, quantityForStock: 0, notes: '', handle: savedHandle() });
// One article line for the multi-article create form (shared customer/Kürzel).
const emptyArticle = () => ({ sourceText: 'Shop', articleNumber: '', description: '', quantity: 1, quantityForStock: 0, link: '', notes: '' });

// Remembered order sources for the quick-pick dropdown (case-insensitive, per PC)
const SOURCES_KEY = 'wp_sources';
const loadSources = () => { try { return JSON.parse(localStorage.getItem(SOURCES_KEY) || '[]'); } catch { return []; } };
const rememberSource = (s) => {
  s = (s || '').trim(); if (!s) return;
  const list = loadSources();
  if (!list.some((x) => x.toLowerCase() === s.toLowerCase())) {
    list.push(s); list.sort((a, b) => a.localeCompare(b));
    localStorage.setItem(SOURCES_KEY, JSON.stringify(list));
  }
};
const monthOptions = () => {
  const out = []; const now = new Date();
  for (let i = 0; i < 24; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
  return out;
};

export default function Bestellungen({ user }) {
  const toast = useToast();
  const isManager = MANAGER.includes(user.role);
  const canCheck = CHECKOFF.includes(user.role);
  const myDept = departmentForRole(user.role);

  const [dept, setDept] = useState(isManager ? 'all' : myDept);
  const [status, setStatus] = useState('open'); // open | ordered (Erledigt)
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [articles, setArticles] = useState([emptyArticle()]); // multi-article (new only)
  const [detail, setDetail] = useState(null); // an order shown in the detail modal
  const [busy, setBusy] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [delMonth, setDelMonth] = useState(monthOptions()[3] || '');
  const [problemFor, setProblemFor] = useState(null); // order being flagged
  const [problemText, setProblemText] = useState('');

  // The server's live source list reflects merges (a merged-away source is gone).
  // Managers get it; others fall back to remembered + visible-order sources.
  const [serverSources, setServerSources] = useState(null); // null = not loaded/authorised
  const knownSources = useMemo(() => {
    const map = new Map();
    const base = serverSources ? serverSources : loadSources();
    [...base, ...rows.map((r) => r.sourceText).filter(Boolean)].forEach((s) => {
      const k = String(s).toLowerCase(); if (!map.has(k)) map.set(k, s);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b));
  }, [rows, serverSources]);

  const loadSourceList = async () => {
    try {
      const d = unwrap(await api.get('/desktop/orders/sources'));
      const names = (d.sources || []).map((s) => s.name);
      setServerSources(names);
      // Prune stale (merged-away) names from this PC's remembered list.
      try { localStorage.setItem(SOURCES_KEY, JSON.stringify([...new Set([...names])])); } catch { /* ignore */ }
    } catch (e) { /* not authorised (non-manager) → keep localStorage fallback */ }
  };

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (isManager && dept !== 'all') q.set('department', dept);
      q.set('status', status);
      const data = unwrap(await api.get(`/desktop/orders?${q.toString()}`));
      setRows(data.orders || []);
    } catch (e) { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); loadSourceList(); /* eslint-disable-next-line */ }, [dept, status]);

  const sorted = useMemo(() => {
    const arr = rows.filter((r) => sourceFilter === 'all' || String(r.sourceText || '').toLowerCase() === sourceFilter.toLowerCase());
    const { key, dir } = sort;
    arr.sort((a, b) => {
      // Orders with a red problem note are ALWAYS pinned to the very top,
      // no matter which column the list is sorted by.
      const ap = a.problemNote ? 1 : 0, bp = b.problemNote ? 1 : 0;
      if (ap !== bp) return bp - ap;
      let av = a[key] ?? '', bv = b[key] ?? '';
      if (key === 'quantity' || key === 'quantityForStock') { av = +av; bv = +bv; }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sort, sourceFilter]);
  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const arrow = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setArticles([emptyArticle()]); setShowForm(true); };
  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({
      sourceText: r.sourceText || 'Shop', link: r.link || '', articleNumber: r.articleNumber || '',
      description: r.description || '', customerName: r.customerName || '', customerNumber: r.customerNumber || '',
      quantity: r.quantity ?? 1, quantityForStock: r.quantityForStock ?? 0, notes: r.notes || '',
      handle: r.handle || savedHandle(),
    });
    setDetail(null);
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.handle.trim()) { toast('Bitte dein Kürzel angeben', { type: 'error' }); return; }
    setBusy(true);
    try {
      localStorage.setItem('wp_handle', form.handle.trim());
      if (editingId) {
        rememberSource(form.sourceText);
        await api.patch(`/desktop/orders/${editingId}`, form);
        toast('Gespeichert');
      } else {
        // One order per article; customer + Kürzel are shared across them.
        const arts = articles.filter((a) => (a.description || a.articleNumber || a.sourceText || '').trim());
        if (arts.length === 0) { toast('Bitte mindestens einen Artikel angeben', { type: 'error' }); setBusy(false); return; }
        for (const a of arts) {
          const payload = {
            sourceText: a.sourceText, articleNumber: a.articleNumber, description: a.description,
            quantity: a.quantity, quantityForStock: a.quantityForStock, link: a.link, notes: a.notes,
            customerName: form.customerName, customerNumber: form.customerNumber, handle: form.handle.trim(),
          };
          if (isManager && dept !== 'all') payload.department = dept;
          rememberSource(a.sourceText);
          await api.post('/desktop/orders', payload);
        }
        toast(arts.length > 1 ? `${arts.length} Bestellungen gespeichert` : 'Bestellung gespeichert');
      }
      setShowForm(false); setEditingId(null); setForm(emptyForm()); setArticles([emptyArticle()]); load();
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const check = async (r, done) => {
    try { await api.patch(`/desktop/orders/${r.id}`, { status: done ? 'ordered' : 'open' }); setDetail(null); load(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };
  const del = async (r) => { if (confirm('Bestellung löschen?')) { try { await api.del(`/desktop/orders/${r.id}`); setDetail(null); load(); } catch (e) { toast(e.message, { type: 'error' }); } } };
  const openProblem = (r) => { setDetail(null); setProblemText(r.problemNote || ''); setProblemFor(r); };
  const submitProblem = async () => {
    setBusy(true);
    try { await api.patch(`/desktop/orders/${problemFor.id}/problem`, { note: problemText.trim(), handle: savedHandle() }); setProblemFor(null); load(); toast(problemText.trim() ? 'Problem gemeldet' : 'Problem entfernt'); }
    catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const purgeMonth = async () => {
    if (!delMonth) return;
    if (!confirm(`Alle erledigten Bestellungen bis einschließlich ${delMonth} endgültig löschen?`)) return;
    try { const r = unwrap(await api.del(`/desktop/orders/done?before=${delMonth}`)); load(); toast(`${r.deleted || 0} gelöscht`); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  return (
    <div>
      <div className="toolbar no-print">
        {isManager && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`pill tab ${dept === 'all' ? 'active' : ''}`} onClick={() => setDept('all')}>Alle</span>
            {ORDER_DEPARTMENTS.map((d) => <span key={d.key} className={`pill tab ${dept === d.key ? 'active' : ''}`} onClick={() => setDept(d.key)}>{d.label}</span>)}
          </div>
        )}
        {!isManager && <span className="muted">Abteilung: <strong>{deptLabel(myDept)}</strong></span>}
        <div className="spacer" />
        <select className="select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} title="Nach Quelle filtern">
          <option value="all">Alle Quellen</option>
          {knownSources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className={`pill tab ${status === 'open' ? 'active' : ''}`} onClick={() => setStatus('open')}>Offen</span>
        <span className={`pill tab ${status === 'ordered' ? 'active' : ''}`} onClick={() => setStatus('ordered')}>Erledigt</span>
        <button className="btn ghost" onClick={() => window.print()}>🖨️ Drucken</button>
        <button className="btn" onClick={openNew}>+ Neue Bestellung</button>
      </div>

      {/* Erledigt: keep them, delete manually up to a chosen month */}
      {status === 'ordered' && canCheck && (
        <div className="toolbar no-print">
          <span className="muted">Erledigte werden aufbewahrt. Aufräumen bis Monat:</span>
          <select className="select" value={delMonth} onChange={(e) => setDelMonth(e.target.value)}>
            {monthOptions().map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn ghost" onClick={purgeMonth}>🗑️ Bis Monat löschen</button>
        </div>
      )}

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : sorted.length === 0 ? (
        <div className="empty"><div className="big">📦</div>{status === 'open' ? 'Keine offenen Bestellungen.' : 'Nichts erledigt.'}</div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr>
              {isManager && <th className="sortable" onClick={() => toggleSort('department')}>Abteilung{arrow('department')}</th>}
              <th className="sortable" onClick={() => toggleSort('sourceText')}>Quelle{arrow('sourceText')}</th>
              <th className="sortable" onClick={() => toggleSort('articleNumber')}>Artikel-Nr.{arrow('articleNumber')}</th>
              <th className="sortable" onClick={() => toggleSort('description')}>Was{arrow('description')}</th>
              <th className="sortable" onClick={() => toggleSort('customerName')}>Für wen{arrow('customerName')}</th>
              <th className="sortable right" onClick={() => toggleSort('quantity')}>Anzahl{arrow('quantity')}</th>
              <th className="right">Lager</th>
              <th className="sortable" onClick={() => toggleSort('handle')}>Kürzel{arrow('handle')}</th>
              <th className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className={r.status === 'ordered' ? 'done' : ''} style={{ cursor: 'pointer', ...(r.problemNote ? { background: 'rgba(229,62,62,.08)' } : {}) }} onClick={() => setDetail(r)}>
                {isManager && <td>{deptLabel(r.department)}</td>}
                <td>{r.sourceText || 'Shop'}{r.link ? <div><a href={r.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>🔗 Link</a></div> : null}</td>
                <td>{r.articleNumber || '—'}</td>
                <td>
                  <strong>{r.description}</strong>
                  {r.problemNote ? <div style={{ color: '#c53030', fontWeight: 800 }}>⚠ {r.problemNote}{r.problemBy ? ` (${r.problemBy})` : ''}</div> : null}
                  {r.notes ? <div className="muted">{r.notes}</div> : null}
                </td>
                <td>{r.customerName || '—'}{r.customerNumber ? <div className="muted">Kd {r.customerNumber}</div> : null}</td>
                <td className="right">{r.quantity}</td>
                <td className="right">{r.quantityForStock || 0}</td>
                <td>{r.handle || '—'}</td>
                <td className="right nowrap no-print" onClick={(e) => e.stopPropagation()}>
                  {isManager && (r.status !== 'ordered'
                    ? <button className="btn sm" onClick={() => check(r, true)}>Erledigt ✓</button>
                    : <button className="btn sm ghost" onClick={() => check(r, false)}>Zurück</button>)}
                  {' '}<button className="btn sm ghost" onClick={() => openProblem(r)} title="Problem melden">⚠</button>
                  {' '}<button className="btn sm ghost" onClick={() => openEdit(r)}>✏️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {/* Detail modal — open an order to see everything + click the link */}
      {detail && (
        <div className="backdrop" {...backdropHandlers(() => setDetail(null))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Bestellung{detail.status === 'ordered' ? ' · erledigt' : ''}</h2>
            {detail.problemNote ? (
              <div className="card" style={{ padding: 10, marginBottom: 12, background: 'rgba(229,62,62,.1)', color: '#c53030', fontWeight: 800 }}>
                ⚠ Problem: {detail.problemNote}{detail.problemBy ? ` (${detail.problemBy})` : ''}
              </div>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 12px', fontSize: 14 }}>
              {isManager && <><span className="muted">Abteilung</span><span>{deptLabel(detail.department)}</span></>}
              <span className="muted">Quelle</span><span>{detail.sourceText || 'Shop'}</span>
              <span className="muted">Artikel-Nr.</span><span>{detail.articleNumber || '—'}</span>
              <span className="muted">Was</span><span><strong>{detail.description}</strong></span>
              <span className="muted">Für wen</span><span>{detail.customerName || '—'}{detail.customerNumber ? ` (Kd ${detail.customerNumber})` : ''}</span>
              <span className="muted">Anzahl</span><span>{detail.quantity}{detail.quantityForStock ? ` · davon fürs Lager: ${detail.quantityForStock}` : ''}</span>
              <span className="muted">Kürzel</span><span>{detail.handle || '—'}</span>
              {detail.notes ? <><span className="muted">Notiz</span><span>{detail.notes}</span></> : null}
              {detail.link ? <><span className="muted">Link</span><span><a href={detail.link} target="_blank" rel="noreferrer">{detail.link}</a></span></> : null}
            </div>
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {isManager && (detail.status !== 'ordered'
                  ? <button className="btn" onClick={() => check(detail, true)}>Erledigt ✓</button>
                  : <button className="btn ghost" onClick={() => check(detail, false)}>Zurück auf offen</button>)}
                <button className="btn ghost" onClick={() => openProblem(detail)}>⚠ Problem</button>
                <button className="btn ghost" onClick={() => del(detail)}>Löschen</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost" onClick={() => openEdit(detail)}>Bearbeiten</button>
                <button className="btn ghost" onClick={() => setDetail(null)}>Schließen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Problem note modal (free text) */}
      {problemFor && (
        <div className="backdrop" {...backdropHandlers(() => setProblemFor(null))}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
            <h2>Problem melden</h2>
            <div className="muted" style={{ marginBottom: 10 }}>{problemFor.description}{problemFor.customerName ? ` · ${problemFor.customerName}` : ''}</div>
            <label className="field full">Was ist das Problem? (z. B. „nicht lieferbar")
              <textarea className="input" rows={4} value={problemText} onChange={(e) => setProblemText(e.target.value)} autoFocus />
            </label>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Leer lassen + Speichern entfernt das Problem. Der Ersteller wird benachrichtigt.</div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setProblemFor(null)}>Abbrechen</button>
              <button className="btn" onClick={submitProblem} disabled={busy}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / edit form */}
      {showForm && (
        <div className="backdrop" {...backdropHandlers(() => setShowForm(false))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Bestellung bearbeiten' : `Neue Bestellung${isManager && dept !== 'all' ? ` – ${deptLabel(dept)}` : ''}`}</h2>
            {/* Shared: Kürzel + customer (used for every article) */}
            <div className="form-grid">
              <label className="field">Dein Kürzel *
                <input className="input" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="z. B. MK" autoFocus />
              </label>
              <label className="field">Kundenname
                <input className="input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </label>
              <label className="field">Kundennummer
                <input className="input" value={form.customerNumber} onChange={(e) => setForm({ ...form, customerNumber: e.target.value })} />
              </label>
            </div>

            {editingId ? (
              /* Edit = a single order */
              <div className="form-grid">
                <label className="field full">Was ist es?
                  <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </label>
                <label className="field">Hersteller / Quelle
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select className="input" style={{ maxWidth: 150 }} value={knownSources.includes(form.sourceText) ? form.sourceText : ''} onChange={(e) => { if (e.target.value) setForm({ ...form, sourceText: e.target.value }); }}>
                      <option value="">Auswählen ▼</option>
                      {knownSources.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input className="input" style={{ flex: 1 }} value={form.sourceText} onChange={(e) => setForm({ ...form, sourceText: e.target.value })} placeholder="oder neu tippen…" />
                  </div>
                </label>
                <label className="field">Artikelnummer
                  <input className="input" value={form.articleNumber} onChange={(e) => setForm({ ...form, articleNumber: e.target.value })} />
                </label>
                <label className="field full">Link (optional)
                  <input className="input" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" />
                </label>
                <label className="field">Anzahl
                  <input className="input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </label>
                <label className="field">davon fürs Lager
                  <input className="input" type="number" min="0" value={form.quantityForStock} onChange={(e) => setForm({ ...form, quantityForStock: e.target.value })} />
                </label>
                <label className="field full">Notiz
                  <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </label>
              </div>
            ) : (
              /* New = one or more articles for the same customer */
              <div style={{ marginTop: 6 }}>
                {articles.map((a, i) => {
                  const setArt = (patch) => setArticles((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  return (
                    <div key={i} className="card" style={{ padding: 10, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <strong>Artikel {i + 1}</strong>
                        {articles.length > 1 ? <button className="btn sm ghost" onClick={() => setArticles((arr) => arr.filter((_, j) => j !== i))}>✕ entfernen</button> : null}
                      </div>
                      <div className="form-grid">
                        <label className="field">Hersteller / Quelle
                          <div style={{ display: 'flex', gap: 6 }}>
                            <select className="input" style={{ maxWidth: 140 }} value={knownSources.includes(a.sourceText) ? a.sourceText : ''} onChange={(e) => { if (e.target.value) setArt({ sourceText: e.target.value }); }}>
                              <option value="">Auswählen ▼</option>
                              {knownSources.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input className="input" style={{ flex: 1 }} value={a.sourceText} onChange={(e) => setArt({ sourceText: e.target.value })} placeholder="oder neu…" />
                          </div>
                        </label>
                        <label className="field">Artikelnummer
                          <input className="input" value={a.articleNumber} onChange={(e) => setArt({ articleNumber: e.target.value })} />
                        </label>
                        <label className="field full">Was ist es?
                          <input className="input" value={a.description} onChange={(e) => setArt({ description: e.target.value })} />
                        </label>
                        <label className="field">Anzahl
                          <input className="input" type="number" min="1" value={a.quantity} onChange={(e) => setArt({ quantity: e.target.value })} />
                        </label>
                        <label className="field">davon fürs Lager
                          <input className="input" type="number" min="0" value={a.quantityForStock} onChange={(e) => setArt({ quantityForStock: e.target.value })} />
                        </label>
                        <label className="field full">Link (optional)
                          <input className="input" value={a.link} onChange={(e) => setArt({ link: e.target.value })} placeholder="https://…" />
                        </label>
                        <label className="field full">Notiz
                          <input className="input" value={a.notes} onChange={(e) => setArt({ notes: e.target.value })} />
                        </label>
                      </div>
                    </div>
                  );
                })}
                <button className="btn ghost" onClick={() => setArticles((arr) => [...arr, emptyArticle()])}>+ Artikel hinzufügen</button>
              </div>
            )}
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <div>
                {editingId && (
                  <button className="btn ghost" style={{ color: '#a52834' }}
                    onClick={async () => { if (confirm('Bestellung wirklich löschen?')) { try { await api.del(`/desktop/orders/${editingId}`); setShowForm(false); setEditingId(null); setDetail(null); load(); toast('Bestellung gelöscht'); } catch (e) { toast(e.message, { type: 'error' }); } } }}>
                    🗑 Löschen
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost" onClick={() => setShowForm(false)}>Abbrechen</button>
                <button className="btn" onClick={submit} disabled={busy || !form.handle.trim()}>Speichern</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
