// Appointment colours by mechanic Kürzel (used in the Robby/Kärcher calendar AND
// the Termine list). Urlaub is always red; unknown Kürzel fall back to grey.
export const KUERZEL_COLOR = {
  MB: '#F2C200', // Marcel Baumann – gelb
  RQ: '#F97316', // Rainer Quappe – orange
  MT: '#9333EA', // Mirco Tammen – lila
  AR: '#7DD3FC', // Andreas Rohlmann – hellblau
};
export const URLAUB_COLOR = '#DC2626';
export const FALLBACK_COLOR = '#94A3B8';

export const apptColor = (a) => {
  if (a.type === 'urlaub') return URLAUB_COLOR;
  const k = String(a.assignedHandle || a.handle || '').trim().toUpperCase();
  return KUERZEL_COLOR[k] || FALLBACK_COLOR;
};

// Dark text on light chips (yellow / light-blue), white otherwise.
export const contrastText = (hex) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#1a2330' : '#ffffff';
};
