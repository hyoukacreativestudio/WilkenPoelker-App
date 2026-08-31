import React, { useEffect, useState } from 'react';
import { api, setToken, setDept, unwrap } from './api.js';
import { backdropHandlers } from './backdrop.js';
import { DEPARTMENTS } from './config.js';

// Passwordless: click a department → you're in. Restricted server-side to the
// department/manager accounts (never real customer accounts). The Admin account
// additionally asks for a password.
export default function Login({ onLogin }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [pwFor, setPwFor] = useState(null); // department awaiting its password
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => { document.documentElement.setAttribute('data-theme', 'light'); }, []);

  const doLogin = async (d, password) => {
    setBusy(d.key); setError('');
    try {
      const res = unwrap(await api.post('/desktop/login', { department: d.key, password }));
      if (!res?.accessToken) throw new Error('Anmeldung fehlgeschlagen');
      setToken(res.accessToken);
      setDept(d.key);
      onLogin(res.user);
    } catch (err) {
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
        <div className="login-hint">Abmelden &amp; Abteilung wechseln ist jederzeit oben links möglich.</div>
      </div>

      {pwFor && (
        <div className="backdrop" {...backdropHandlers(() => setPwFor(null))}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 360 }}>
            <h2>🛡️ Admin – Passwort</h2>
            <div style={{ position: 'relative', marginTop: 8 }}>
              <input className="input" type={showPw ? 'text' : 'password'} value={pw} autoFocus
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitPw(); }}
                placeholder="Passwort" style={{ paddingRight: 40, width: '100%' }} />
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
