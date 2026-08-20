import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';

// Merge duplicate order sources (e.g. "amazon" + "Amazon" → "Amazon") across all
// departments. For admin / Bestellungen / Service.
export default function Quellen() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState({});     // { name: true }
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(unwrap(await api.get('/desktop/orders/sources')).sources || []); }
    catch (e) { toast(e.message, { type: 'error' }); setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const selected = useMemo(() => rows.filter((r) => sel[r.name]).map((r) => r.name), [rows, sel]);
  const toggle = (name) => setSel((s) => ({ ...s, [name]: !s[name] }));

  const merge = async () => {
    const to = target.trim();
    if (!to) { toast('Bitte Ziel-Quelle eingeben oder wählen', { type: 'error' }); return; }
    if (selected.length < 1) { toast('Bitte Quellen zum Zusammenführen auswählen', { type: 'error' }); return; }
    if (!confirm(`${selected.join(', ')} → „${to}" zusammenführen? Alle betroffenen Bestellungen werden umbenannt.`)) return;
    setBusy(true);
    try {
      const r = unwrap(await api.post('/desktop/orders/sources/merge', { from: selected, to }));
      toast(`${r.updated || 0} Bestellungen umbenannt`);
      setSel({}); setTarget(''); load();
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="toolbar no-print">
        <span className="muted">Doppelte Quellen zusammenführen (Groß/Klein wird ignoriert)</span>
        <div className="spacer" />
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : rows.length === 0 ? (
        <div className="empty"><div className="big">🏷️</div>Noch keine Quellen.</div>
      ) : (
        <>
          <div className="table-wrap"><table>
            <thead><tr><th style={{ width: 40 }}></th><th>Quelle</th><th className="right">Bestellungen</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td><input type="checkbox" checked={!!sel[r.name]} onChange={() => toggle(r.name)} /></td>
                  <td><strong>{r.name}</strong></td>
                  <td className="right">{r.count}</td>
                  <td className="right"><button className="btn sm ghost" onClick={() => setTarget(r.name)}>als Ziel</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>

          <div className="toolbar" style={{ marginTop: 12 }}>
            <span className="muted">Ausgewählt ({selected.length}) zusammenführen zu:</span>
            <input className="input" style={{ minWidth: 200 }} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Ziel-Quelle (Name)" />
            <button className="btn" onClick={merge} disabled={busy || !target.trim() || selected.length < 1}>Zusammenführen</button>
          </div>
        </>
      )}
    </div>
  );
}
