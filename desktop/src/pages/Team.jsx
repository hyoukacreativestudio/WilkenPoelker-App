import React, { useEffect, useRef, useState } from 'react';
import { api, unwrap, mediaUrl, apiOrigin } from '../api.js';
import { useToast } from '../toast.jsx';
import { useLiveReload } from '../customers.jsx';

// The team list of "Über uns" in the app and on the website: departments with
// their people (name, position, phone, photo). Saved as a whole; the website
// is rebuilt about a minute after saving.
const NEW_DEPT_COLOR = '#2E7D32';

// Photo of a person: uploaded photo first, else the picture bundled with the app
function photoUrl(m) {
  if (m.imageUrl) return mediaUrl(m.imageUrl);
  if (m.image && !/^placeholder/.test(m.image)) return `${apiOrigin}/api/about/team-photos/${encodeURIComponent(m.image)}.jpg`;
  return '';
}
const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// Picture -> JPEG data URL, at most 1000 px (the server makes 800 px of it)
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} konnte nicht gelesen werden`)); };
    img.src = url;
  });
}

const move = (list, i, d) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const n = [...list];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
};

function Avatar({ m }) {
  const [broken, setBroken] = useState(false);
  const src = photoUrl(m);
  useEffect(() => setBroken(false), [src]);
  const box = { width: 44, height: 44, borderRadius: '50%', flex: '0 0 44px' };
  if (src && !broken) return <img src={src} alt="" style={{ ...box, objectFit: 'cover' }} onError={() => setBroken(true)} />;
  return <div style={{ ...box, display: 'grid', placeItems: 'center', background: 'var(--dept-soft)', fontWeight: 700, fontSize: 14 }}>{initials(m.name)}</div>;
}

export default function Team() {
  const toast = useToast();
  const [depts, setDepts] = useState([]);
  const [saved, setSaved] = useState('[]');
  const [stamp, setStamp] = useState(null); // updatedAt of the loaded list
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(null); // "d-m" of the person whose photo is uploading
  const fileRef = useRef(null);
  const target = useRef(null);

  const dirty = JSON.stringify(depts) !== saved;

  const fetchTeam = async () => {
    const res = await api.get('/about/team');
    return { list: res?.data?.departments || [], updatedAt: res?.updatedAt || null };
  };

  const load = async ({ silent = false } = {}) => {
    if (silent && dirty) return; // never overwrite changes that are not saved yet
    if (!silent) setLoading(true);
    try {
      const { list, updatedAt } = await fetchTeam();
      if (silent && updatedAt === stamp) return;
      setDepts(list);
      setSaved(JSON.stringify(list));
      setStamp(updatedAt);
    } catch (e) {
      if (!silent) toast(e.message, { type: 'error' });
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useLiveReload(load, [dirty, stamp]);

  const setDept = (di, fn) => setDepts((l) => l.map((d, i) => (i === di ? fn(d) : d)));
  const setMember = (di, mi, patch) => setDept(di, (d) => ({ ...d, members: d.members.map((m, j) => (j === mi ? { ...m, ...patch } : m)) }));

  const addDept = () => {
    const label = window.prompt('Name der neuen Abteilung:');
    if (!label || !label.trim()) return;
    setDepts((l) => [...l, { key: label.trim(), label: label.trim(), color: NEW_DEPT_COLOR, icon: 'account-group', members: [] }]);
  };
  const removeDept = (di) => {
    const d = depts[di];
    if (d.members.length && !window.confirm(`Abteilung "${d.label}" mit ${d.members.length} Personen entfernen?`)) return;
    setDepts((l) => l.filter((_, i) => i !== di));
  };
  const addMember = (di) => setDept(di, (d) => ({ ...d, members: [...d.members, { name: '', position: '', phone: null, image: '' }] }));
  const removeMember = (di, mi) => {
    const m = depts[di].members[mi];
    if (m.name && !window.confirm(`${m.name} aus dem Team entfernen?`)) return;
    setDept(di, (d) => ({ ...d, members: d.members.filter((_, j) => j !== mi) }));
  };

  const pickPhoto = (di, mi) => { target.current = [di, mi]; fileRef.current.value = ''; fileRef.current.click(); };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !target.current) return;
    const [di, mi] = target.current;
    setUploading(`${di}-${mi}`);
    try {
      const res = await api.post('/desktop/team/photo', { data: await shrinkImage(file) });
      const url = unwrap(res)?.url;
      if (!url) throw new Error('Das Foto konnte nicht hochgeladen werden.');
      setMember(di, mi, { imageUrl: url });
      toast('Foto hochgeladen. Zum Übernehmen noch speichern.');
    } catch (err) {
      toast(err.message, { type: 'error' });
    } finally {
      setUploading(null);
    }
  };
  const removePhoto = (di, mi) => setMember(di, mi, { imageUrl: undefined, image: '' });

  const save = async () => {
    // Clean up: trimmed texts, empty phone as null, no empty people
    const clean = depts.map((d) => ({
      ...d,
      label: String(d.label || '').trim(),
      members: d.members
        .map((m) => {
          const out = { ...m, name: String(m.name || '').trim(), position: String(m.position || '').trim(), phone: String(m.phone || '').trim() || null };
          if (!out.imageUrl) delete out.imageUrl;
          return out;
        })
        .filter((m) => m.name || m.position),
    }));
    if (clean.some((d) => !d.label)) { toast('Jede Abteilung braucht einen Namen.', { type: 'error' }); return; }
    if (clean.some((d) => d.members.some((m) => !m.name))) { toast('Jede Person braucht einen Namen.', { type: 'error' }); return; }
    setBusy(true);
    try {
      // Someone else (app or another PC) may have changed the team meanwhile
      const now = await fetchTeam();
      if (now.updatedAt !== stamp && !window.confirm('Das Team wurde inzwischen in der App oder an einem anderen PC geändert. Trotzdem speichern und diese Änderung überschreiben?')) return;
      const res = await api.put('/about/team/departments', { content: clean });
      if (res?.queued) { toast('Keine Verbindung: wird gespeichert, sobald der Server wieder erreichbar ist.'); }
      else toast('Team gespeichert. Die Website wird in etwa einer Minute aktualisiert.');
      const fresh = res?.queued ? null : await fetchTeam().catch(() => null);
      setDepts(fresh ? fresh.list : clean);
      setSaved(JSON.stringify(fresh ? fresh.list : clean));
      if (fresh) setStamp(fresh.updatedAt);
    } catch (e) {
      toast(e.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    if (!window.confirm('Alle ungespeicherten Änderungen verwerfen?')) return;
    setDepts(JSON.parse(saved));
  };

  if (loading) return <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  const people = depts.reduce((n, d) => n + d.members.length, 0);

  return (
    <div style={{ maxWidth: 1100 }}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onFile} />
      <div className="toolbar">
        <span className="muted">{depts.length} Abteilungen, {people} Personen. Gilt für die App und die Website.{dirty ? ' Ungespeicherte Änderungen.' : ''}</span>
        <div className="spacer" />
        <button className="btn ghost" onClick={addDept} disabled={busy}>+ Abteilung</button>
        {dirty ? <button className="btn ghost" onClick={discard} disabled={busy}>Verwerfen</button> : null}
        <button className="btn" onClick={save} disabled={busy || !dirty}>Speichern</button>
      </div>

      {depts.length === 0 ? <div className="empty"><div className="big">👥</div>Noch keine Abteilungen.</div> : null}

      {depts.map((d, di) => (
        <div key={di} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0 0 10px' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: d.color || NEW_DEPT_COLOR, flex: '0 0 12px' }} />
            <input className="input" style={{ fontWeight: 700, flex: 1, maxWidth: 360 }} value={d.label || ''} maxLength={120} aria-label="Name der Abteilung"
              onChange={(e) => setDept(di, (x) => ({ ...x, label: e.target.value }))} />
            <button className="btn sm ghost" title="Abteilung nach oben" disabled={di === 0} onClick={() => setDepts((l) => move(l, di, -1))}>↑</button>
            <button className="btn sm ghost" title="Abteilung nach unten" disabled={di === depts.length - 1} onClick={() => setDepts((l) => move(l, di, 1))}>↓</button>
            <div className="spacer" />
            <button className="btn sm ghost" onClick={() => addMember(di)}>+ Person</button>
            <button className="btn sm ghost" onClick={() => removeDept(di)}>Abteilung entfernen</button>
          </div>
          {d.members.length === 0 ? <div className="muted" style={{ marginLeft: 20 }}>Noch niemand in dieser Abteilung.</div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Foto</th><th>Name</th><th>Position</th><th>Telefon</th><th></th></tr></thead>
              <tbody>
                {d.members.map((m, mi) => (
                  <tr key={mi}>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Avatar m={m} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <button className="btn sm ghost" onClick={() => pickPhoto(di, mi)} disabled={uploading != null}>
                            {uploading === `${di}-${mi}` ? 'Lädt hoch …' : 'Foto wählen'}
                          </button>
                          {photoUrl(m) ? <button className="btn sm ghost" onClick={() => removePhoto(di, mi)}>Foto entfernen</button> : null}
                        </div>
                      </div>
                    </td>
                    <td><input className="input" value={m.name || ''} maxLength={120} placeholder="Vor- und Nachname" onChange={(e) => setMember(di, mi, { name: e.target.value })} /></td>
                    <td><input className="input" style={{ minWidth: 240 }} value={m.position || ''} maxLength={120} placeholder="z. B. Verkauf - Experte E-Bikes" onChange={(e) => setMember(di, mi, { position: e.target.value })} /></td>
                    <td><input className="input" value={m.phone || ''} maxLength={40} placeholder="Durchwahl (optional)" onChange={(e) => setMember(di, mi, { phone: e.target.value })} /></td>
                    <td className="right nowrap">
                      <button className="btn sm ghost" title="Nach oben" disabled={mi === 0} onClick={() => setDept(di, (x) => ({ ...x, members: move(x.members, mi, -1) }))}>↑</button>{' '}
                      <button className="btn sm ghost" title="Nach unten" disabled={mi === d.members.length - 1} onClick={() => setDept(di, (x) => ({ ...x, members: move(x.members, mi, 1) }))}>↓</button>{' '}
                      <select className="select" style={{ minWidth: 0, padding: '5px 8px', fontSize: 13 }} value="" aria-label="In andere Abteilung verschieben"
                        onChange={(e) => {
                          const to = Number(e.target.value);
                          if (Number.isNaN(to)) return;
                          setDepts((l) => l.map((x, i) => {
                            if (i === di) return { ...x, members: x.members.filter((_, j) => j !== mi) };
                            if (i === to) return { ...x, members: [...x.members, m] };
                            return x;
                          }));
                        }}>
                        <option value="">Verschieben …</option>
                        {depts.map((x, i) => (i === di ? null : <option key={i} value={i}>{x.label}</option>))}
                      </select>{' '}
                      <button className="btn sm ghost" onClick={() => removeMember(di, mi)}>Entfernen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      ))}
      <p className="muted" style={{ fontSize: 12.5 }}>
        Fotos werden quadratisch zugeschnitten (Gesicht in die Mitte). Ohne Foto zeigen die App einen Platzhalter und die Website die Anfangsbuchstaben.
        Die Website wird etwa eine Minute nach dem Speichern aktualisiert.
      </p>
    </div>
  );
}
