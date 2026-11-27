import { useCallback, useEffect, useState } from 'react';
import { settingsApi } from '../api/settings';

// Opening hours of the current season as the server keeps them (edited in the
// app under "Öffnungszeiten" or in the PC program). Every screen that shows
// them reads them here; until the first answer (or without a connection)
// `hours` is null and the screens show their fixed fallback hours.
let cached = null; // { season, schedule } of the last good answer
const listeners = new Set();

export async function loadOpeningHours() {
  const d = await settingsApi.getOpeningHours();
  if (Array.isArray(d?.schedule) && d.schedule.length) {
    cached = { season: d.season, schedule: d.schedule };
    listeners.forEach((fn) => fn(cached));
  }
  return cached;
}

export function useOpeningHours() {
  const [hours, setHours] = useState(cached);
  useEffect(() => {
    listeners.add(setHours);
    loadOpeningHours().catch(() => { /* keep the last known hours */ });
    return () => { listeners.delete(setHours); };
  }, []);
  const reload = useCallback(() => loadOpeningHours().catch(() => cached), []);
  return { hours, reload };
}
