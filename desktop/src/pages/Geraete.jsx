import React, { useEffect, useState } from 'react';
import { api, unwrap } from '../api.js';
import { useToast } from '../toast.jsx';
import { backdropHandlers } from '../backdrop.js';

// Admin only: which PCs may use the PC program. A new PC gets a one-time
// pairing code (valid 24 hours), entered once on that PC's login screen.
// A lost or sold PC is locked here ("Sperren"): it can no longer log in.
const fmt = (d) => (d ? new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–');

const STATUS = {
  paired: { label: 'Freigeschaltet', color: '#2E7D32' },
  code: { label: 'Code offen', color: '#b45309' },
  revoked: { label: 'Gesperrt', color: '#6b7280' },
};

export default function Geraete() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [required, setRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [askName, setAskName] = useState(false);
  const [name, setName] = useState('');
  const [newCode, setNewCode] = useState(null); // { code, name, validUntil }

  const load = async () => {
    setLoading(true);
    try {
      const d = unwrap(await api.get('/desktop/devices'));
      setRows(d.devices || []);
      setRequired(!!d.required);
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const createCode = async () => {
    try {
      const d = unwrap(await api.post('/desktop/devices', { name: name.trim() || 'PC' }));
      setAskName(false); setName('');
      setNewCode(d);
      load();
    } catch (e) { toast(e.message, { type: 'error' }); }
  };

  const revoke = async (r) => {
    const what = r.status === 'code' ? `Den offenen Code für „${r.name}“ ungültig machen?` : `„${r.name}“ sperren? Dieser PC kann sich danach nicht mehr anmelden.`;
    if (!window.confirm(what)) return;
    try { await api.delete(`/desktop/devices/${r.id}`); toast(r.status === 'code' ? 'Code ungültig' : 'PC gesperrt'); load(); }
    catch (e) { toast(e.message, { type: 'error' }); }
  };

  const active = rows.filter((r) => r.status === 'paired').length;
  return (
    <div>
      <div className="toolbar no-print">
        <span className="muted">
          {active} freigeschaltete{active === 1 ? 'r' : ''} PC{active === 1 ? '' : 's'}.{' '}
          {required
            ? 'Der Schutz ist eingeschaltet: nur diese PCs können sich anmelden.'
            : 'Der Schutz ist noch aus: jeder PC kann sich anmelden. Eingeschaltet wird er mit dem Skript auf dem Server.'}
        </span>
        <div className="spacer" />
        <button className="btn ghost" onClick={load}>Aktualisieren</button>
        <button className="btn" onClick={() => { setAskName(true); setName(''); }}>Neuen PC freischalten</button>
      </div>

      {loading ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : rows.length === 0 ? (
        <div className="empty"><div className="big">🖥️</div>Noch kein PC freigeschaltet.</div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>PC</th><th>Status</th><th>Freigeschaltet</th><th>Zuletzt benutzt</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.status === 'revoked' ? 'done' : ''}>
                <td><b>{r.name}</b></td>
                <td>
                  <span className="pill" style={{ background: STATUS[r.status]?.color, color: '#fff', fontWeight: 650 }}>{STATUS[r.status]?.label || r.status}</span>
                  {r.status === 'code' && <div className="muted">gültig bis {fmt(r.codeValidUntil)}</div>}
                  {r.status === 'revoked' && <div className="muted">seit {fmt(r.revokedAt)}</div>}
                </td>
                <td className="nowrap">{fmt(r.pairedAt)}</td>
                <td className="nowrap">{fmt(r.lastSeenAt)}</td>
                <td className="right nowrap">
                  {r.status !== 'revoked' && <button className="btn sm ghost" onClick={() => revoke(r)}>{r.status === 'code' ? 'Code löschen' : 'Sperren'}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {askName && (
        <div className="backdrop" {...backdropHandlers(() => setAskName(false))}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
            <h2>Neuen PC freischalten</h2>
            <p className="muted" style={{ marginTop: 0 }}>Du bekommst einen Code, den du am neuen PC auf dem Anmeldebildschirm eingibst. Er gilt 24 Stunden und nur einmal.</p>
            <input className="input" value={name} autoFocus onChange={(e) => setName(e.target.value.slice(0, 80))}
              onKeyDown={(e) => { if (e.key === 'Enter') createCode(); }}
              placeholder="Name des PCs, z. B. Werkstatt" style={{ width: '100%' }} />
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setAskName(false)}>Abbrechen</button>
              <button className="btn" onClick={createCode}>Code erstellen</button>
            </div>
          </div>
        </div>
      )}

      {newCode && (
        <div className="backdrop" {...backdropHandlers(() => setNewCode(null))}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 440 }}>
            <h2>Kopplungscode für „{newCode.name}“</h2>
            <div className="code-box">{newCode.code}</div>
            <p className="muted">Am neuen PC das PC-Programm öffnen, „Diesen PC mit einem Kopplungscode freischalten“ wählen und den Code eingeben. Gültig bis {fmt(newCode.validUntil)}. Der Code wird nur jetzt angezeigt.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setNewCode(null)}>Fertig</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
