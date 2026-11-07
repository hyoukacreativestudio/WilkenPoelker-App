import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap, mediaUrl } from '../api.js';
import { backdropHandlers } from '../backdrop.js';
import { useToast } from '../toast.jsx';
import { useLiveReload } from '../customers.jsx';

// Product pages for app + website, built automatically from Bruno's Taifun
// stock export (SFTP /Bestand). Here: visibility, pictures, variants, brands.
const FILTERS = [
  { key: 'all', label: 'Alle', count: 'total' },
  { key: 'no_image', label: 'Ohne Bild', count: 'noImage' },
  { key: 'hidden', label: 'Ausgeblendet', count: 'hidden' },
  { key: 'unknown_brand', label: 'Ohne Hersteller', count: 'unknownBrand' },
  { key: 'review', label: 'Prüfen', count: 'review' },
];
const VISIBILITY = [
  { key: 'auto', label: 'Automatisch' },
  { key: 'show', label: 'Immer anzeigen' },
  { key: 'hide', label: 'Ausblenden' },
];
const ENRICH = { found: 'Herstellerdaten ✓', found_model: 'Herstellerdaten ✓ (Modell-Treffer)', not_found: 'nicht gefunden', error: 'Fehler beim Abruf', manual: 'von Hand', review: 'beim Hersteller nicht mehr vorhanden, Bilder entfernt', null: 'noch nicht gesucht' };
const euro = (v) => (v == null ? '—' : `${Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('de-DE') : '—');
const qty = (v) => (v == null ? '—' : Number(v).toLocaleString('de-DE', { maximumFractionDigits: 2 }));

export default function Produkte() {
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [main, setMain] = useState('');     // Kategorie (as in the app), '' = all
  const [device, setDevice] = useState(''); // Gerät inside the Kategorie
  const [mainOrder, setMainOrder] = useState([]);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [showBrands, setShowBrands] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const d = unwrap(await api.get(`/desktop/shop/products?filter=${filter}`));
      setRows(d.products || []);
      setCounts(d.counts || {});
      if (d.mainOrder) setMainOrder(d.mainOrder);
    } catch (e) { if (!silent) { toast(e.message, { type: 'error' }); setRows([]); } } finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);
  useLiveReload(load, [filter]);

  // Kategorie -> Gerät with counts (only categories that have products in this view)
  const mains = useMemo(() => {
    const c = new Map();
    rows.forEach((r) => c.set(r.main, (c.get(r.main) || 0) + 1));
    return [...c.entries()].sort((a, b) => mainOrder.indexOf(a[0]) - mainOrder.indexOf(b[0]));
  }, [rows, mainOrder]);
  const devices = useMemo(() => {
    const c = new Map();
    rows.filter((r) => r.main === main).forEach((r) => c.set(r.device, (c.get(r.device) || 0) + 1));
    return [...c.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'));
  }, [rows, main]);
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows
      .filter((r) => (!main || r.main === main) && (!device || r.device === device))
      .filter((r) => words.every((w) => `${r.title} ${r.brand || ''} ${r.category || ''} ${r.articles.map((a) => a.artNr).join(' ')}`.toLowerCase().includes(w)));
  }, [rows, q, main, device]);
  const detail = rows.find((r) => r.id === detailId) || null;

  const setVisibility = async (r, visibility) => {
    try { await api.patch(`/desktop/shop/products/${r.id}`, { visibility }); setRows((list) => list.map((x) => (x.id === r.id ? { ...x, visibility } : x))); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };
  const importNow = async () => {
    setBusy(true);
    try {
      const d = unwrap(await api.post('/desktop/shop/import', {}));
      const r = d.result || {};
      toast(r.scanned ? `${r.scanned} Datei(en) eingelesen, ${r.articles} Artikel` : 'Keine neuen Dateien – Seiten neu berechnet');
      load();
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const recheckNow = async () => {
    try {
      await api.post('/desktop/shop/recheck', {});
      toast('Prüfung läuft im Hintergrund. Das Ergebnis kommt als Benachrichtigung.');
    } catch (e) { toast(e.message, { type: 'error' }); }
  };

  return (
    <div>
      <div className="toolbar no-print">
        {FILTERS.map((f) => (
          <span key={f.key} className={`pill tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}{counts[f.count] != null ? ` (${counts[f.count]})` : ''}
          </span>
        ))}
        <div className="spacer" />
        <select className="select" value={main} onChange={(e) => { setMain(e.target.value); setDevice(''); }} title="Kategorie">
          <option value="">Alle Kategorien</option>
          {mains.map(([m, n]) => <option key={m} value={m}>{m} ({n})</option>)}
        </select>
        {main && (
          <select className="select" value={device} onChange={(e) => setDevice(e.target.value)} title="Gerät">
            <option value="">Alle Geräte</option>
            {devices.map(([d, n]) => <option key={d} value={d}>{d} ({n})</option>)}
          </select>
        )}
        <input className="input" style={{ maxWidth: 260 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen: Name, Hersteller, Art.-Nr.…" />
        <button className="btn ghost" onClick={() => setShowBrands(true)}>🏷️ Hersteller</button>
        <button className="btn ghost" onClick={recheckNow} title="Läuft sonst automatisch am ersten Sonntag im Monat">🔍 Bilder und Daten prüfen</button>
        <button className="btn" onClick={importNow} disabled={busy}>⟳ Bestand jetzt einlesen</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : shown.length === 0 ? (
        <div className="empty"><div className="big">🛒</div>{q || main ? 'Nichts gefunden.' : 'Keine Produkte. Bruno legt die Bestandsdateien im SFTP-Ordner „Bestand“ ab.'}</div>
      ) : (
        <div className="table-wrap"><table>
          <thead>
            <tr>
              <th style={{ width: 64 }}></th>
              <th>Produkt</th>
              <th>Hersteller</th>
              <th className="right">Preis</th>
              <th>Verfügbar</th>
              <th className="right">Varianten</th>
              <th>Herstellerdaten</th>
              <th>Sichtbarkeit</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} style={{ cursor: 'pointer', opacity: r.visibility === 'hide' ? 0.55 : 1 }} onClick={() => setDetailId(r.id)}>
                <td>{r.images[0] ? <img src={mediaUrl(r.images[0].thumb || r.images[0].url)} alt="" style={{ width: 52, height: 52, objectFit: 'contain', background: '#fff', borderRadius: 6 }} /> : <div className="muted" style={{ fontSize: 22, textAlign: 'center' }}>📷</div>}</td>
                <td><strong>{r.title}</strong><div className="muted" style={{ fontSize: 12 }}>{[r.category, r.group].filter(Boolean).join(' · ')}</div></td>
                <td>{r.brand || <span style={{ color: '#c53030' }}>unbekannt</span>}</td>
                <td className="right nowrap">{euro(r.price)}{r.isOffer ? <div className="muted" style={{ fontSize: 12, textDecoration: 'line-through' }}>{euro(r.uvp)}</div> : null}</td>
                <td>{r.available ? '✅ ja' : '— nein'}</td>
                <td className="right">{r.articles.length}</td>
                <td className="muted" style={{ fontSize: 12 }}>{ENRICH[r.enrichStatus] || r.enrichStatus}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select className="select" value={r.visibility} onChange={(e) => setVisibility(r, e.target.value)}>
                    {VISIBILITY.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {detail && <ProductDetail product={detail} onClose={() => setDetailId(null)} onChanged={load} />}
      {showBrands && <Brands onClose={() => setShowBrands(false)} onChanged={load} />}
    </div>
  );
}

// Picture file -> data URL, at most 2000 px on the long side (JPEG 0.9).
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} konnte nicht gelesen werden`)); };
    img.src = url;
  });
}

function ProductDetail({ product: p, onClose, onChanged }) {
  const toast = useToast();
  const [imgUrl, setImgUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); if (ok) toast(ok); await onChanged(); } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const enrich = () => run(async () => {
    const d = unwrap(await api.post(`/desktop/shop/products/${p.id}/enrich`, {}));
    toast({ found: 'Herstellerdaten geladen', not_found: 'Auf der Herstellerseite nicht eindeutig gefunden', no_enricher: 'Für diesen Hersteller gibt es noch keinen automatischen Abruf', error: 'Herstellerseite nicht erreichbar' }[d.result] || d.result);
  });
  const addImage = () => run(async () => { await api.post(`/desktop/shop/products/${p.id}/images`, { url: imgUrl.trim() }); setImgUrl(''); }, 'Bild hinzugefügt');
  const removeImage = (i) => { if (window.confirm('Dieses Bild entfernen?')) run(() => api.del(`/desktop/shop/products/${p.id}/images/${i}`), 'Bild entfernt'); };
  const makeMain = (i) => run(() => api.post(`/desktop/shop/products/${p.id}/images/${i}/main`, {}), 'Hauptbild geändert');
  // Pictures from the PC: scaled down here (max. 2000 px, JPEG) so the upload stays small
  const uploadFiles = (files) => run(async () => {
    for (const file of [...files]) {
      if (!file.type.startsWith('image/')) throw new Error(`${file.name} ist kein Bild`);
      await api.post(`/desktop/shop/products/${p.id}/images/upload`, { data: await shrinkImage(file) });
    }
  }, files.length > 1 ? `${files.length} Bilder hochgeladen` : 'Bild hochgeladen');

  // Technical data: edited here, saved as a whole. Live reload does not touch the form.
  const [specs, setSpecs] = useState(() => (p.officialSpecs || []).map(([k, v]) => [k, v]));
  const [specsDirty, setSpecsDirty] = useState(false);
  const editSpec = (i, col, value) => { setSpecs((l) => l.map((row, j) => (j === i ? (col === 0 ? [value, row[1]] : [row[0], value]) : row))); setSpecsDirty(true); };
  const addSpec = () => { setSpecs((l) => [...l, ['', '']]); setSpecsDirty(true); };
  const removeSpec = (i) => { setSpecs((l) => l.filter((_, j) => j !== i)); setSpecsDirty(true); };
  const moveSpec = (i, d) => { setSpecs((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; }); setSpecsDirty(true); };
  const saveSpecs = () => run(async () => {
    const d = unwrap(await api.patch(`/desktop/shop/products/${p.id}`, { officialSpecs: specs }));
    setSpecs((d.product?.officialSpecs || []).map(([k, v]) => [k, v]));
    setSpecsDirty(false);
  }, 'Technische Daten gespeichert');
  const close = () => { if (!specsDirty || window.confirm('Technische Daten sind noch nicht gespeichert. Trotzdem schließen?')) onClose(); };
  const regroup = (a, action) => {
    let slug;
    if (action === 'move') {
      slug = prompt('Zu welchem Produkt verschieben? Adresse (Slug) des Ziel-Produkts, z. B. stihl-ms-172');
      if (!slug) return;
    }
    run(() => api.post(`/desktop/shop/articles/${a.id}/regroup`, { action, slug }), 'Varianten neu zugeordnet');
  };

  return (
    <div className="backdrop" {...backdropHandlers(close)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 900, maxWidth: '96vw' }}>
        <h2>{p.title}</h2>
        <div className="muted" style={{ marginTop: -8, marginBottom: 12, fontSize: 13 }}>
          {[p.brand, p.category, p.group].filter(Boolean).join(' · ')} · Adresse: <code>{p.slug}</code>
          {p.officialUrl ? <> · <a href={p.officialUrl} target="_blank" rel="noreferrer">Herstellerseite ↗</a></> : null}
        </div>

        <strong>Bilder</strong>{p.enrichStatus === 'manual' ? <span className="muted" style={{ fontSize: 12 }}> · von Hand bearbeitet – wird nicht automatisch überschrieben</span> : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 10px' }}>
          {p.images.length === 0 && <span className="muted">Noch keine Bilder.</span>}
          {p.images.map((img, i) => (
            <div key={img.url} style={{ position: 'relative', textAlign: 'center' }}>
              <img src={mediaUrl(img.thumb || img.url)} alt="" style={{ width: 96, height: 96, objectFit: 'contain', background: '#fff', border: i === 0 ? '2px solid #2E7D32' : '1px solid #ddd', borderRadius: 6 }} />
              <button className="btn sm ghost" style={{ position: 'absolute', top: 2, right: 2, padding: '0 6px' }} onClick={() => removeImage(i)} disabled={busy} title="Bild entfernen">✕</button>
              <div style={{ fontSize: 11, marginTop: 2 }}>
                {i === 0 ? <span style={{ color: '#2E7D32', fontWeight: 600 }}>Hauptbild</span>
                  : <button className="btn sm ghost" style={{ padding: '0 6px', fontSize: 11 }} onClick={() => makeMain(i)} disabled={busy}>★ Hauptbild</button>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <label className="btn ghost" style={{ cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            📁 Bild vom PC
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} disabled={busy}
              onChange={(e) => { const f = e.target.files; if (f && f.length) uploadFiles(f); e.target.value = ''; }} />
          </label>
          <input className="input" style={{ flex: 1, minWidth: 220 }} value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="oder Bild-Link von der offiziellen Herstellerseite (https://…)" />
          <button className="btn ghost" onClick={addImage} disabled={busy || !imgUrl.trim()}>+ Bild</button>
          <button className="btn ghost" onClick={() => { if (p.enrichStatus !== 'manual' || window.confirm('Bilder und Daten wurden von Hand bearbeitet. Mit den Herstellerdaten überschreiben?')) enrich(); }} disabled={busy}>⟳ Herstellerdaten holen</button>
        </div>

        <strong>Varianten / Taifun-Artikel</strong>
        <div className="table-wrap" style={{ margin: '8px 0 14px' }}><table>
          <thead><tr><th>Art.-Nr.</th><th>Taifun-Text</th><th className="right">Bestand</th><th className="right">reserviert</th><th className="right">frei</th><th className="right">UVP</th><th className="right">Ladenpreis</th><th>geändert</th><th></th></tr></thead>
          <tbody>
            {p.articles.map((a) => (
              <tr key={a.id}>
                <td className="nowrap">{a.artNr}{a.manual ? <div className="muted" style={{ fontSize: 11 }}>von Hand zugeordnet</div> : null}</td>
                <td style={{ whiteSpace: 'pre-line', fontSize: 12 }}>{a.text1}</td>
                <td className="right">{qty(a.stock)}</td>
                <td className="right">{qty(a.reserved)}</td>
                <td className="right"><strong>{qty(a.free)}</strong></td>
                <td className="right nowrap">{euro(a.uvp)}</td>
                <td className="right nowrap">{a.shopPrice ? euro(a.shopPrice) : '—'}</td>
                <td className="nowrap">{fmtDate(a.datePut)}</td>
                <td className="nowrap">
                  {p.articles.length > 1 && <button className="btn sm ghost" onClick={() => regroup(a, 'split')} disabled={busy} title="Eigene Produktseite">Eigene Seite</button>}
                  {' '}<button className="btn sm ghost" onClick={() => regroup(a, 'move')} disabled={busy}>Verschieben…</button>
                  {a.manual && <>{' '}<button className="btn sm ghost" onClick={() => regroup(a, 'auto')} disabled={busy}>Automatisch</button></>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>

        <strong>Technische Daten</strong>
        <span className="muted" style={{ fontSize: 12 }}> · stehen so in der App und auf der Website</span>
        <div style={{ margin: '8px 0' }}>
          {specs.length === 0 && <div className="muted" style={{ marginBottom: 6 }}>Noch keine technischen Daten.</div>}
          {specs.map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <input className="input" style={{ width: 230 }} value={k} onChange={(e) => editSpec(i, 0, e.target.value)} placeholder="z. B. Leistung" />
              <input className="input" style={{ flex: 1 }} value={v} onChange={(e) => editSpec(i, 1, e.target.value)} placeholder="z. B. 3,0 kW" />
              <button className="btn sm ghost" onClick={() => moveSpec(i, -1)} disabled={i === 0} title="nach oben">▲</button>
              <button className="btn sm ghost" onClick={() => moveSpec(i, 1)} disabled={i === specs.length - 1} title="nach unten">▼</button>
              <button className="btn sm ghost" onClick={() => removeSpec(i)} title="Zeile löschen">✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn sm ghost" onClick={addSpec}>+ Zeile</button>
            <button className="btn sm" onClick={saveSpecs} disabled={busy || !specsDirty}>Technische Daten speichern</button>
          </div>
        </div>
        <div className="modal-actions"><button className="btn ghost" onClick={close}>Schließen</button></div>
      </div>
    </div>
  );
}

function Brands({ onClose, onChanged }) {
  const toast = useToast();
  const [brands, setBrands] = useState([]);
  const [draft, setDraft] = useState({ name: '', keywords: '', prefixes: '' });
  const load = async () => { try { setBrands(unwrap(await api.get('/desktop/shop/brands')).brands || []); } catch (e) { toast(e.message, { type: 'error' }); } };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const save = async (b) => {
    try {
      if (b.id) await api.put(`/desktop/shop/brands/${b.id}`, b); else await api.post('/desktop/shop/brands', b);
      toast(`${b.name} gespeichert – Produkte neu zugeordnet`);
      setDraft({ name: '', keywords: '', prefixes: '' });
      load(); onChanged();
    } catch (e) { toast(e.message, { type: 'error' }); }
  };
  const edit = (id, patch) => setBrands((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const join = (v) => (Array.isArray(v) ? v.join(', ') : v || '');

  return (
    <div className="backdrop" {...backdropHandlers(onClose)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 760, maxWidth: '96vw' }}>
        <h2>Hersteller-Kennwörter</h2>
        <div className="muted" style={{ marginTop: -8, marginBottom: 12, fontSize: 13 }}>
          Kommt ein Kennwort im Taifun-Namen vor, bekommt das Produkt diesen Hersteller. Die Artikelnummer-Kürzel (z. B. STI) sind nur der Notbehelf.
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>Hersteller</th><th>Kennwörter (mit Komma)</th><th>Art.-Nr.-Kürzel</th><th></th></tr></thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id}>
                <td><strong>{b.name}</strong></td>
                <td><input className="input" value={join(b.keywords)} onChange={(e) => edit(b.id, { keywords: e.target.value })} /></td>
                <td><input className="input" value={join(b.prefixes)} onChange={(e) => edit(b.id, { prefixes: e.target.value })} /></td>
                <td><button className="btn sm" onClick={() => save({ id: b.id, name: b.name, keywords: join(b.keywords), prefixes: join(b.prefixes) })}>Speichern</button></td>
              </tr>
            ))}
            <tr>
              <td><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Neuer Hersteller" /></td>
              <td><input className="input" value={draft.keywords} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} placeholder="z. B. husqvarna" /></td>
              <td><input className="input" value={draft.prefixes} onChange={(e) => setDraft({ ...draft, prefixes: e.target.value })} placeholder="z. B. HUS" /></td>
              <td><button className="btn sm" onClick={() => save(draft)} disabled={!draft.name.trim()}>+ Anlegen</button></td>
            </tr>
          </tbody>
        </table></div>
        <div className="modal-actions"><button className="btn ghost" onClick={onClose}>Schließen</button></div>
      </div>
    </div>
  );
}
