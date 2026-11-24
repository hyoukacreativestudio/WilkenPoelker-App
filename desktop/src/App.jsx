import React, { useEffect, useState } from 'react';
import { api, setToken, getToken, getDept, setDept, setAdminTicket, unwrap } from './api.js';
import Login from './Login.jsx';
import Shell from './Shell.jsx';
import { ToastProvider } from './toast.jsx';
import ContextMenu from './contextmenu.jsx';
import { CustomerProfileProvider } from './customerProfile.jsx';

export default function App() {
  return (
    <ToastProvider>
      <CustomerProfileProvider>
        <Root />
      </CustomerProfileProvider>
      <ContextMenu />
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

  const handleLogout = () => { setToken(null); setDept(null); setAdminTicket(null); setUser(null); };

  // The server refused the silent re-login (PC no longer paired, Admin ticket
  // expired): show the login screen instead of failing requests.
  useEffect(() => {
    const ended = () => setUser(null);
    window.addEventListener('wp-session-ended', ended);
    return () => window.removeEventListener('wp-session-ended', ended);
  }, []);

  if (loading) {
    return <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: '#5b6b5d' }}>Lädt…</div>;
  }
  if (!user) return <Login onLogin={setUser} />;
  return <Shell user={user} onLogout={handleLogout} />;
}
