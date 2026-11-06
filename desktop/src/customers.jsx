import React, { useEffect, useRef } from 'react';

// Shared helpers for every PC-tool list with customers (except the Robby list):
// the "Ohne App / Mit App" tabs, live reloading and WhatsApp messages.

export const APP_SCOPES = [
  { key: 'no_app', label: '☎️ Ohne App' },
  { key: 'app', label: '📱 Mit App' },
];

export function AppTabs({ value, onChange, counts = {} }) {
  return (
    <>
      {APP_SCOPES.map((s) => (
        <span key={s.key} className={`pill tab ${value === s.key ? 'active' : ''}`} onClick={() => onChange(s.key)}>
          {s.label}{counts[s.key] ? <span className="n">{counts[s.key]}</span> : null}
        </span>
      ))}
    </>
  );
}

// Small marker for day boards that stay one list (Termine heute, Reparaturen heute)
export const AppBadge = ({ on }) => (on ? <span title="Kunde hat die App – bekommt Statusänderungen aufs Handy" style={{ marginLeft: 6 }}>📱</span> : null);

// Row filter + counts for lists whose rows carry hasApp
export const inScope = (scope) => (row) => (scope === 'app' ? !!row.hasApp : !row.hasApp);
export const scopeCounts = (rows, isOpen = () => true) => ({
  no_app: rows.filter((r) => !r.hasApp && isOpen(r)).length,
  app: rows.filter((r) => r.hasApp && isOpen(r)).length,
});

// Reload in the background so changes appear while the page is open (user wish
// 2026-11-06: every 5 seconds, always - also while the window is in the
// background), plus right away when the window gets the focus again.
// load({ silent: true }) must not show the big spinner or error toasts.
// A reload that is still running is not started a second time.
export const LIVE_RELOAD_MS = 5000;
export function useLiveReload(load, deps = [], ms = LIVE_RELOAD_MS) {
  const ref = useRef(load);
  ref.current = load;
  const busy = useRef(false);
  useEffect(() => {
    const run = async () => {
      if (busy.current) return;
      busy.current = true;
      try { await ref.current({ silent: true }); } catch { /* next round */ } finally { busy.current = false; }
    };
    const t = setInterval(run, ms);
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', run);
    return () => { clearInterval(t); window.removeEventListener('focus', run); document.removeEventListener('visibilitychange', run); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// German number -> WhatsApp format (49...). Landlines cannot receive WhatsApp,
// so only mobile numbers (015x/016x/017x) qualify; the mobile field wins.
export function whatsappNumber(...numbers) {
  for (const raw of numbers) {
    let d = String(raw || '').replace(/[^\d+]/g, '');
    if (!d) continue;
    if (d.startsWith('+')) d = d.slice(1);
    else if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0')) d = `49${d.slice(1)}`;
    if (/^491[567]\d{7,10}$/.test(d)) return d;
    if (!d.startsWith('49') && /^\d{10,15}$/.test(d)) return d; // foreign mobile with country code
  }
  return null;
}

export const SHOP_SIGNATURE = 'Viele Grüße\nIhr Team von Wilken Poelker\nTel. 04952 5304';

const salutation = (name) => (name ? `Guten Tag ${name},` : 'Guten Tag,');
const what = (info) => (info ? ` (${info})` : '');

// Finished order. Neu: new bikes also get the note that the battery is still charging.
export function readyText({ name, info, category, department, delivery }) {
  const bike = ['fahrrad', 'elektro'].includes(department);
  let body;
  if (category === 'neu') {
    body = delivery
      ? `Ihr neues Gerät${what(info)} ist fertig und wird zu Ihnen geliefert. Wir melden uns wegen des Termins.`
      : `Ihr neues ${bike ? 'Rad' : 'Gerät'}${what(info)} ist fertig und kann bei uns abgeholt werden.`;
    if (bike && !delivery) body += '\n\nHinweis: Der Akku wird noch geladen. Falls Sie mit dem Rad nach Hause fahren möchten, geben Sie uns bitte kurz vorher Bescheid.';
  } else if (category === 'leasing') {
    body = `Ihr Leasing-Rad${what(info)} ist fertig und kann bei uns abgeholt werden.`;
  } else {
    body = `Ihre Reparatur${what(info)} ist fertig und kann bei uns abgeholt werden.`;
  }
  return `${salutation(name)}\n\n${body}\n\n${SHOP_SIGNATURE}`;
}

export function kvaText({ name, info }) {
  return `${salutation(name)}\n\nfür Ihre Reparatur${what(info)} haben wir einen Kostenvoranschlag erstellt. Bitte melden Sie sich kurz bei uns, ob wir die Reparatur so durchführen sollen.\n\n${SHOP_SIGNATURE}`;
}

// Kundenbestellung: what the customer gets, depending on where the order is.
// "Offen" = ordered, still waiting; everything after = the part is here.
export function customerOrderText({ name, items = [], number, step, signature = true }) {
  const list = items.map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${i.description}`).filter(Boolean).join(', ');
  const what = list ? ` (${list})` : '';
  const nr = number ? ` Nr. ${number}` : '';
  const body = step === 'waiting'
    ? `Ihre Bestellung${nr}${what} ist bei uns in Arbeit. Wir melden uns, sobald alles da ist.`
    : `Ihre Bestellung${nr}${what} ist da und kann bei uns abgeholt werden.`;
  return `${salutation(name)}\n\n${body}${signature ? `\n\n${SHOP_SIGNATURE}` : ''}`;
}

// Message window for app customers (notification + push). Not sent while the
// text still has a ___ gap (e.g. the KVA amount).
export function MessageModal({ title, hint, text, onChange, onClose, onSend, busy }) {
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <div className="muted" style={{ marginBottom: 8 }}>{hint || 'Kommt als Benachrichtigung aufs Handy und steht in der App unter Mitteilungen.'}</div>
        <textarea className="input" rows={9} style={{ width: '100%', resize: 'vertical' }} value={text} onChange={(e) => onChange(e.target.value)} autoFocus />
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn" disabled={busy || !text.trim()} onClick={onSend}>{busy ? 'Sende…' : 'Senden'}</button>
        </div>
      </div>
    </div>
  );
}

export function openWhatsApp(number, text) {
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

// Green WhatsApp button; disabled with a hint when there is no mobile number.
export function WhatsAppButton({ number, text, onSent, label = 'WhatsApp' }) {
  if (!number) return <button className="btn sm ghost" disabled title="Keine Handynummer hinterlegt">WhatsApp –</button>;
  return (
    <button
      className="btn sm"
      style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
      title={`WhatsApp an +${number} mit fertigem Text öffnen`}
      onClick={() => { openWhatsApp(number, text); if (onSent) onSent(); }}
    >💬 {label}</button>
  );
}
