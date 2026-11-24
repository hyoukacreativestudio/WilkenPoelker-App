import React, { useEffect, useState } from 'react';
import { api, setToken, setDept, setAdminTicket, setDeviceToken, getDeviceToken, unwrap } from './api.js';
import { backdropHandlers } from './backdrop.js';
import { DEPARTMENTS } from './config.js';

// Click a department → you're in. Restricted server-side to the department/
// manager accounts (never real customer accounts). The Admin account
// additionally asks for a password. Once the device protection is switched on
// (server .env DESKTOP_DEVICE_PAIRING=on) only PCs paired with a one-time code
// from the Admin may log in; this screen then asks for that code first.
export default function Login({ onLogin }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [pwFor, setPwFor] = useState(null); // department awaiting its password
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [device, setDevice] = useState(null); // { required, paired, name } from the server
  const [pairing, setPairing] = useState(false);

  useEffect(() => { document.documentElement.setAttribute('data-theme', 'light'); }, []);

  useEffect(() => {
    (async () => {
      const token = getDeviceToken();
      try {
        const s = unwrap(await api.post('/desktop/device/status', { deviceToken: token || undefined }));
        if (token && !s.paired) setDeviceToken(null); // revoked by the Admin
        setDevice(s);
        if (s.required && !s.paired) setPairing(true);
      } catch {
        setDevice({ required: false, paired: !!token, name: null, unknown: true });
      }
    })();
  }, []);

  const doLogin = async (d, password) => {
    setBusy(d.key); setError('');
    try {
      const res = unwrap(await api.post('/desktop/login', { department: d.key, password, deviceToken: getDeviceToken() || undefined }));
      if (!res?.accessToken) throw new Error('Anmeldung fehlgeschlagen');
      setToken(res.accessToken);
      setDept(d.key);
      setAdminTicket(res.adminTicket || null); // Admin: silent re-login without keeping the password
      onLogin(res.user);
    } catch (err) {
      if (err.code === 'DEVICE_NOT_PAIRED') { setDeviceToken(null); setDevice((s) => ({ ...(s || {}), required: true, paired: false })); setPairing(true); }
      setError(err.message || 'Anmeldung fehlgeschlagen');
      setBusy(null);
    }
  };

  const pick = (d) => {
    if (busy) return;
    setError('');
    if (d.key === 'admin') { setPwFor(d); setPw(''); setShowPw(false); return; }
    doLogin(d);
  };
  const submitPw = () => { const d = pwFor; setPwFor(null); doLogin(d, pw); };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-head">
          <div className="logo">🌿</div>
          <div>
            <h1>WilkenPoelker</h1>
          </div>
        </div>

        {device === null ? (
          <div className="empty"><div className="spinner" style={{ margin: '24px auto' }} /></div>
        ) : pairing ? (
          <PairDevice
            required={device.required && !device.paired}
            onCancel={() => { setPairing(false); setError(''); }}
            onPaired={(name) => { setDevice((s) => ({ ...(s || {}), paired: true, name })); setPairing(false); setError(''); }}
          />
        ) : (
          <>
            <p>Firmenprogramm – zum Anmelden einfach deine Abteilung anklicken.</p>

            <div className="dept-grid">
              {DEPARTMENTS.map((d) => (
                <button
                  key={d.key}
                  className={`dept-card ${busy === d.key ? 'busy' : ''}`}
                  onClick={() => pick(d)}
                  style={{ borderColor: busy === d.key ? d.color : undefined }}
                >
                  {busy === d.key && <span className="mini-spin" />}
                  <span className="emoji" style={{ background: d.color }}>{d.icon}</span>
                  {d.label}
                  <span className="bar" style={{ background: d.color }} />
                </button>
              ))}
            </div>

            {error ? <div className="login-error">{error}</div> : null}
            <div className="login-hint">
              Abmelden &amp; Abteilung wechseln ist jederzeit unten links möglich.
              <br />
              {device.paired
                ? <>Freigeschalteter PC{device.name ? `: ${device.name}` : ''}</>
                : <button type="button" className="link-btn" onClick={() => { setPairing(true); setError(''); }}>Diesen PC mit einem Kopplungscode freischalten</button>}
            </div>
          </>
        )}
      </div>

      {pwFor && (
        <div className="backdrop" {...backdropHandlers(() => setPwFor(null))}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 360 }}>
            <h2>🛡️ Admin – Passwort</h2>
            <div style={{ position: 'relative', marginTop: 8 }}>
              <input className="input" type={showPw ? 'text' : 'password'} value={pw} autoFocus
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitPw(); }}
                placeholder="Passwort" autoComplete="current-password" style={{ paddingRight: 40, width: '100%' }} />
              <button type="button" onClick={() => setShowPw((s) => !s)} title={showPw ? 'Verbergen' : 'Anzeigen'}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setPwFor(null)}>Abbrechen</button>
              <button className="btn" onClick={submitPw} disabled={!pw}>Anmelden</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// One-time code from the Admin ("PCs" page in this program, or the setup
// script on the server) → this PC gets its own device key.
function PairDevice({ required, onCancel, onPaired }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const res = unwrap(await api.post('/desktop/device/pair', { code, name: name.trim() || undefined }));
      if (!res?.deviceToken) throw new Error('Freischalten fehlgeschlagen');
      setDeviceToken(res.deviceToken);
      onPaired(res.name);
    } catch (err) {
      setError(err.message || 'Freischalten fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const onCode = (v) => {
    const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCode(raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw);
  };

  return (
    <form onSubmit={submit}>
      <p>
        {required
          ? 'Dieser PC ist noch nicht freigeschaltet. Das Firmenprogramm läuft nur auf freigeschalteten Firmen-PCs.'
          : 'Schalte diesen PC einmalig frei, dann funktioniert das Programm hier auch, wenn der Schutz eingeschaltet ist.'}
        {' '}Den Kopplungscode bekommst du vom Admin. Er gilt 24 Stunden und nur für einen PC.
      </p>
      <div style={{ display: 'grid', gap: 12, maxWidth: 380 }}>
        <label>
          <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Kopplungscode</div>
          <input className="input" value={code} onChange={(e) => onCode(e.target.value)} autoFocus required
            placeholder="ABCD-EFGH" autoComplete="off" spellCheck={false}
            style={{ width: '100%', fontSize: 20, letterSpacing: 2, fontFamily: 'ui-monospace, Consolas, monospace' }} />
        </label>
        <label>
          <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Name des PCs (freiwillig)</div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value.slice(0, 80))}
            placeholder="z. B. Werkstatt oder Kasse 1" autoComplete="off" style={{ width: '100%' }} />
        </label>
      </div>
      {error ? <div className="login-error">{error}</div> : null}
      <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
        <button className="btn" type="submit" disabled={busy || code.replace('-', '').length !== 8}>{busy ? 'Wird freigeschaltet …' : 'PC freischalten'}</button>
        {!required && <button className="btn ghost" type="button" onClick={onCancel}>Abbrechen</button>}
      </div>
    </form>
  );
}
