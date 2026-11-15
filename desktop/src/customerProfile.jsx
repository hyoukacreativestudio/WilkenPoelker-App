import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, unwrap } from './api.js';
import { useToast } from './toast.jsx';
import { backdropHandlers } from './backdrop.js';

// Customer profile (2026-11-15): click a customer name anywhere in the PC tool.
// Shows the app account and the Taifun customer, the customer number (enter or
// change it right here, no request needed) and the customer's tickets,
// appointments, repairs and orders.

const Ctx = createContext(() => {});
export const useCustomerProfile = () => useContext(Ctx);

export function CustomerProfileProvider({ children }) {
  const [who, setWho] = useState(null);
  const open = useCallback((w) => setWho(w), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {who ? <ProfileModal who={who} onClose={() => setWho(null)} /> : null}
    </Ctx.Provider>
  );
}

// Clickable customer name. Clicks do not reach the row/card underneath.
export function CustomerName({ name, userId, customerNumber, email, phone, children, style }) {
  const open = useCustomerProfile();
  const label = children || name || (customerNumber ? `Kd ${customerNumber}` : '—');
  // Without an account, number or e-mail there is nothing to look up
  if (!userId && !customerNumber && !email) return <span style={style}>{label}</span>;
  return (
    <span
      className="custlink"
      role="button"
      tabIndex={0}
      title="Kundenprofil öffnen"
      style={style}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); open({ name, userId, customerNumber, email, phone }); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); open({ name, userId, customerNumber, email, phone }); } }}
    >{label}</span>
  );
}

const TICKET_STATUS = { open: 'Offen', in_progress: 'In Bearbeitung', confirmed: 'Bestätigt', completed: 'Erledigt', closed: 'Geschlossen', cancelled: 'Storniert' };
const APPT_STATUS = { pending: 'Anfrage', proposed: 'Vorgeschlagen', confirmed: 'Bestätigt', completed: 'Erledigt', cancelled: 'Storniert', rescheduled: 'Verschoben' };
const ORDER_STATUS = { open: 'Offen', ordered: 'Bestellt', cancelled: 'Storniert' };
const ROLE_LABEL = { customer: 'Kunde', admin: 'Admin', super_admin: 'Admin' };
const d = (v) => (v ? new Date(v).toLocaleDateString('de-DE') : '');

function ProfileModal({ who, onClose }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('repairs');
  const [num, setNum] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const q = new URLSearchParams();
      for (const k of ['userId', 'customerNumber', 'email', 'name']) if (who[k]) q.set(k, String(who[k]));
      const res = unwrap(await api.get(`/desktop/customer-profile?${q}`));
      setData(res);
      setNum(res.account?.customerNumber || '');
      if (!res.repairs?.length && res.tickets?.length) setTab('tickets');
    } catch (e) { setError(e.message); }
  }, [who]);
  useEffect(() => { load(); }, [load]);

  const acc = data?.account;
  const tf = data?.taifun;
  const name = acc?.name || tf?.name || who.name || '—';
  const kd = acc?.customerNumber || data?.customerNumber || '';
  const isAdminAccount = acc && ['admin', 'super_admin'].includes(acc.role);
  // Staff may enter a missing number on any non-admin account and change it on
  // customer accounts (the server checks this too)
  const canEdit = acc && !isAdminAccount && (acc.role === 'customer' || !acc.customerNumber);

  const saveNumber = async () => {
    const value = num.trim();
    if (value === (acc.customerNumber || '')) { setEditing(false); return; }
    if (acc.customerNumber && !confirm(value ? `Kundennummer von ${acc.customerNumber} auf ${value} ändern?` : `Kundennummer ${acc.customerNumber} entfernen?`)) return;
    setBusy(true);
    try {
      await api.put(`/admin/users/${acc.id}`, { customerNumber: value || null });
      toast(value ? `Kundennummer ${value} eingetragen` : 'Kundennummer entfernt');
      setEditing(false);
      await load();
    } catch (e) { toast(e.message, { type: 'error' }); } finally { setBusy(false); }
  };

  const phone = acc?.phone || tf?.mobile || tf?.phone || who.phone || '';
  const address = acc?.address && (acc.address.street || acc.address.city)
    ? [acc.address.street, [acc.address.zip, acc.address.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    : (tf ? [tf.street, [tf.zip, tf.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '');

  const tabs = data ? [
    { key: 'repairs', label: 'Reparaturen', n: data.repairs.length },
    { key: 'tickets', label: 'Tickets', n: data.tickets.length },
    { key: 'appointments', label: 'Termine', n: data.appointments.length },
    { key: 'orders', label: 'Bestellungen', n: data.orders.length },
  ] : [];

  return (
    <div className="backdrop" style={{ zIndex: 70 }} {...backdropHandlers(onClose)}>
      <div className="modal" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: 6 }}>{name}</h2>
        <div className="muted" style={{ marginBottom: 16 }}>
          {acc ? `📱 App-Konto${ROLE_LABEL[acc.role] ? '' : ' (Mitarbeiter)'}${acc.since ? ` seit ${d(acc.since)}` : ''}` : '☎️ Kein App-Konto'}
        </div>

        {error ? <div className="card" style={{ padding: 12, marginBottom: 12 }}>⚠️ {error}</div> : null}
        {!data && !error ? <div className="muted">Lädt…</div> : null}

        {data ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 12px', fontSize: 14, marginBottom: 16, alignItems: 'center' }}>
              <span className="muted">Kundennummer</span>
              {editing ? (
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input className="input" style={{ maxWidth: 160 }} value={num} autoFocus placeholder="z. B. 42146"
                    onChange={(e) => setNum(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveNumber(); if (e.key === 'Escape') setEditing(false); }} />
                  <button className="btn sm" onClick={saveNumber} disabled={busy}>Speichern</button>
                  <button className="btn sm ghost" onClick={() => { setEditing(false); setNum(acc.customerNumber || ''); }}>Abbrechen</button>
                </span>
              ) : (
                <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 16 }}>{kd || <span className="muted" style={{ fontWeight: 400 }}>keine</span>}</strong>
                  {canEdit ? (
                    <button className="btn sm ghost" onClick={() => setEditing(true)}>{acc.customerNumber ? 'Ändern' : '+ Kundennummer eintragen'}</button>
                  ) : null}
                </span>
              )}
              {phone ? <><span className="muted">Telefon</span><span>☎ {phone}{tf?.mobile && tf?.phone && phone !== tf.phone ? ` · ${tf.phone}` : ''}</span></> : null}
              {acc?.email || tf?.email ? <><span className="muted">E-Mail</span><span>{acc?.email || tf?.email}</span></> : null}
              {address ? <><span className="muted">Adresse</span><span>{address}</span></> : null}
              {!acc && !kd ? <><span /><span className="muted">Zu diesem Namen gibt es weder ein App-Konto noch eine Kundennummer.</span></> : null}
              {!acc && kd ? <><span /><span className="muted">Kunde hat (noch) kein App-Konto mit dieser Nummer.</span></> : null}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {tabs.map((t) => (
                <span key={t.key} className={`pill tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                  {t.label}{t.n ? <span className="n">{t.n}</span> : null}
                </span>
              ))}
            </div>

            <ProfileList tab={tab} data={data} />
          </>
        ) : null}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );
}

function ProfileList({ tab, data }) {
  const rows = {
    repairs: data.repairs.map((r) => ({
      key: r.id, when: d(r.date), main: r.info || `Auftrag ${r.nr}`,
      side: r.storno ? 'Storniert' : (r.appStatusLabel || (r.erledigt ? 'Erledigt' : 'Offen')), sub: `Auftrag ${r.nr}`,
    })),
    tickets: data.tickets.map((t) => ({
      key: t.id, when: d(t.createdAt), main: t.title || t.ticketNumber, side: TICKET_STATUS[t.status] || t.status, sub: t.ticketNumber,
    })),
    appointments: data.appointments.map((a) => ({
      key: a.id, when: d(a.date), main: a.title || '—', side: APPT_STATUS[a.status] || a.status,
      sub: a.startTime ? `${String(a.startTime).slice(0, 5)} Uhr` : '',
    })),
    orders: data.orders.map((o) => ({
      key: o.id, when: d(o.createdAt), main: o.description || '—', side: ORDER_STATUS[o.status] || o.status, sub: '',
    })),
  }[tab] || [];
  if (!rows.length) {
    const empty = { repairs: data.customerNumber ? 'Keine Reparaturen zu dieser Kundennummer.' : 'Reparaturen gibt es erst mit Kundennummer.', tickets: 'Keine Tickets.', appointments: 'Keine Termine.', orders: 'Keine Bestellungen.' };
    return <div className="muted" style={{ padding: '10px 0' }}>{empty[tab]}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflow: 'auto' }}>
      {rows.map((r) => (
        <div key={r.key} className="card" style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '84px 1fr auto', gap: 10, alignItems: 'center', fontSize: 13.5 }}>
          <span className="muted">{r.when}</span>
          <span style={{ minWidth: 0 }}>{r.main}{r.sub ? <div className="sub2">{r.sub}</div> : null}</span>
          <span className="muted" style={{ whiteSpace: 'nowrap' }}>{r.side}</span>
        </div>
      ))}
    </div>
  );
}
