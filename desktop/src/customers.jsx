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

// Reload in the background so status changes appear while the window is open:
// every few seconds, when the window gets the focus again and when it becomes
// visible. load({ silent: true }) must not show the big spinner.
export function useLiveReload(load, deps = [], ms = 15000) {
  const ref = useRef(load);
  ref.current = load;
  useEffect(() => {
    const run = () => { if (!document.hidden) ref.current({ silent: true }); };
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
