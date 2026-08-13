import React, { useEffect, useState } from 'react';
import { api, setToken, getToken, unwrap } from './api.js';
import Login from './Login.jsx';
import Shell from './Shell.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on load
  useEffect(() => {
    (async () => {
      if (!getToken()) { setLoading(false); return; }
      try {
        const me = unwrap(await api.get('/users/profile'));
        setUser(me.user || me);
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = () => { setToken(null); setUser(null); };

  if (loading) {
    return <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: '#5b6b5d' }}>Lädt…</div>;
  }
  if (!user) return <Login onLogin={setUser} />;
  return <Shell user={user} onLogout={handleLogout} />;
}
