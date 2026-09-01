import React, { useEffect, useState } from 'react';
import { api, setToken, getToken, getDept, setDept, setDeptSecret, unwrap } from './api.js';
import Login from './Login.jsx';
import Shell from './Shell.jsx';
import { ToastProvider } from './toast.jsx';

export default function App() {
  return (
    <ToastProvider>
      <Root />
    </ToastProvider>
  );
}

function Root() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on load. If we have a stored department, the api client will
  // silently re-login when the token is missing/expired — so a restart or an
  // expired token just works (on any number of PCs).
  useEffect(() => {
    (async () => {
      if (!getToken() && !getDept()) { setLoading(false); return; }
      try {
        const me = unwrap(await api.get('/users/profile'));
        setUser(me.user || me);
      } catch {
        setToken(null); setDept(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = () => { setToken(null); setDept(null); setDeptSecret(''); setUser(null); };

  if (loading) {
    return <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: '#5b6b5d' }}>Lädt…</div>;
  }
  if (!user) return <Login onLogin={setUser} />;
  return <Shell user={user} onLogout={handleLogout} />;
}
