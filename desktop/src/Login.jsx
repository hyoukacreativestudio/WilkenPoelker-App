import React, { useState } from 'react';
import { api, setToken, unwrap } from './api.js';
import { DEPARTMENTS } from './config.js';

export default function Login({ onLogin }) {
  const [dept, setDept] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pickDept = (d) => {
    setDept(d.key);
    setEmail(d.email);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = unwrap(await api.post('/auth/login', { email: email.trim(), password }));
      if (!res?.accessToken) throw new Error('Anmeldung fehlgeschlagen');
      setToken(res.accessToken);
      onLogin(res.user);
    } catch (err) {
      setError(err.message || 'Anmeldung fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>WilkenPoelker</h1>
        <p>Firmenprogramm – Abteilung wählen und anmelden</p>

        <div className="dept-grid">
          {DEPARTMENTS.map((d) => (
            <button
              key={d.key}
              type="button"
              className={`dept-btn ${dept === d.key ? 'active' : ''}`}
              onClick={() => pickDept(d)}
            >
              <span className="dot" style={{ background: d.color }} />
              {d.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="field">
              E-Mail
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="abteilung@wilkenpoelker.de" autoComplete="username" />
            </label>
            <label className="field">
              Passwort
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
          </div>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn" type="submit" disabled={busy || !email || !password} style={{ width: '100%', marginTop: 18, opacity: (busy || !email || !password) ? .6 : 1 }}>
            {busy ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
