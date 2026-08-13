import React, { useState } from 'react';
import { api, setToken, unwrap } from './api.js';
import { DEPARTMENTS } from './config.js';

// Passwordless: click a department → you're in. Restricted server-side to the
// department/manager accounts (never real customer accounts).
export default function Login({ onLogin }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const pick = async (d) => {
    if (busy) return;
    setBusy(d.key); setError('');
    try {
      const res = unwrap(await api.post('/desktop/login', { department: d.key }));
      if (!res?.accessToken) throw new Error('Anmeldung fehlgeschlagen');
      setToken(res.accessToken);
      onLogin(res.user);
    } catch (err) {
      setError(err.message || 'Anmeldung fehlgeschlagen');
      setBusy(null);
    }
  };

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
    </div>
  );
}
