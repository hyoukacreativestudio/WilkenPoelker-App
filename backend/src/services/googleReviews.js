const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Google reviews for the website (Places API (New), Place Details).
//
// Google's rules (developers.google.com/maps/documentation/places/web-service/policies):
//  - ratings and reviews must NOT be cached or stored, only the place ID may be
//    kept. So every display asks Google again (in-flight requests are shared,
//    nothing is kept afterwards).
//  - the author (avatar, name, profile link) and a link to the review on Google
//    Maps must be shown, plus the Google Maps attribution and the sort order.
// Cost: the "reviews" field is billed as Place Details Enterprise + Atmosphere,
// 1,000 calls per month are free. A hard monthly limit (default 900) keeps it
// free: above it the website shows only links to Google (no API call).
//
// Setup (server .env): GOOGLE_PLACES_API_KEY=<key restricted to "Places API (New)"
// and the server's IP>; optional GOOGLE_PLACE_ID (otherwise found once by name),
// GOOGLE_REVIEWS_MONTHLY_LIMIT (default 900).

const API = 'https://places.googleapis.com/v1';
const QUERY = 'Wilken Poelker GmbH & Co. KG, Langholter Straße 43, 26842 Ostrhauderfehn';
const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'google-reviews-state.json');
// Only Google's avatar host may be passed through the avatar route
const AVATAR_HOST = /^https:\/\/lh\d\.googleusercontent\.com\//;

const key = () => (process.env.GOOGLE_PLACES_API_KEY || '').trim();
const monthlyLimit = () => Math.max(0, parseInt(process.env.GOOGLE_REVIEWS_MONTHLY_LIMIT || '900', 10) || 0);
const monthOf = (d = new Date()) => d.toISOString().slice(0, 7);

// Place ID + call counter per month (no Google content in here)
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function writeState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    logger.warn('Google reviews: state not saved', { error: e.message });
  }
}
function usage() {
  const s = readState();
  return s.month === monthOf() ? (s.calls || 0) : 0;
}
function countCall() {
  const s = readState();
  const month = monthOf();
  if (s.month !== month) { s.month = month; s.calls = 0; }
  s.calls = (s.calls || 0) + 1;
  writeState(s);
}

async function googleFetch(url, { method = 'GET', body, fieldMask }) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key(),
      'X-Goog-FieldMask': fieldMask,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Google Places: ${msg}`);
  }
  return data;
}

// The place ID may be stored indefinitely. Text Search with only the ID field
// ("IDs Only") is free of charge.
async function placeId() {
  if (process.env.GOOGLE_PLACE_ID) return process.env.GOOGLE_PLACE_ID.trim();
  const s = readState();
  if (s.placeId) return s.placeId;
  const data = await googleFetch(`${API}/places:searchText`, {
    method: 'POST',
    body: { textQuery: QUERY, languageCode: 'de', regionCode: 'DE', pageSize: 1 },
    fieldMask: 'places.id',
  });
  const id = data?.places?.[0]?.id;
  if (!id) throw new Error('Google Places: Betrieb nicht gefunden');
  writeState({ ...readState(), placeId: id });
  logger.info('Google reviews: place ID found', { placeId: id });
  return id;
}

// Links that need no API call (shown when the API is not set up or the
// monthly limit is reached)
function fallbackLinks(id) {
  const search = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Wilken Poelker Ostrhauderfehn')}`;
  return {
    reviewsUri: id ? `https://www.google.com/maps/place/?q=place_id:${id}` : search,
    writeAReviewUri: id ? `https://search.google.com/local/writereview?placeid=${id}` : search,
  };
}

let inFlight = null; // concurrent page views share one call; nothing is kept

async function loadFromGoogle() {
  const id = await placeId();
  if (usage() >= monthlyLimit()) {
    return { available: false, reason: 'limit', ...fallbackLinks(id) };
  }
  countCall();
  const p = await googleFetch(`${API}/places/${encodeURIComponent(id)}?languageCode=de&regionCode=DE`, {
    fieldMask: 'rating,userRatingCount,reviews,googleMapsUri,googleMapsLinks',
  });
  const links = { ...fallbackLinks(id), ...(p.googleMapsLinks || {}) };
  return {
    available: true,
    rating: p.rating ?? null,
    count: p.userRatingCount ?? 0,
    mapsUri: p.googleMapsUri || links.placeUri || null,
    reviewsUri: links.reviewsUri || p.googleMapsUri || null,
    writeAReviewUri: links.writeAReviewUri || null,
    // Google returns up to 5 reviews, "most relevant" first (the website says so)
    reviews: (p.reviews || []).map((r) => ({
      rating: r.rating ?? null,
      text: r.text?.text || r.originalText?.text || '',
      relativeTime: r.relativePublishTimeDescription || '',
      publishTime: r.publishTime || null,
      googleMapsUri: r.googleMapsUri || null,
      author: {
        name: r.authorAttribution?.displayName || 'Google-Nutzer',
        uri: r.authorAttribution?.uri || null,
        // Shown through our server (avatar route), so the visitor's browser does
        // not contact Google by itself
        photo: AVATAR_HOST.test(r.authorAttribution?.photoUri || '')
          ? `/api/website/reviews/avatar?u=${encodeURIComponent(r.authorAttribution.photoUri)}` : null,
      },
    })),
  };
}

async function getReviews() {
  if (!key()) return { available: false, reason: 'not_configured', ...fallbackLinks(readState().placeId || process.env.GOOGLE_PLACE_ID) };
  if (!inFlight) {
    inFlight = loadFromGoogle()
      .catch((e) => {
        logger.warn('Google reviews failed', { error: e.message });
        return { available: false, reason: 'error', ...fallbackLinks(readState().placeId || process.env.GOOGLE_PLACE_ID) };
      })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

// Passes the author's avatar through (not stored). Only Google's avatar host.
async function streamAvatar(rawUrl, res) {
  const url = String(rawUrl || '');
  if (!AVATAR_HOST.test(url)) { res.status(400).end(); return; }
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) { res.status(404).end(); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 300 * 1024) { res.status(413).end(); return; }
    res.set('Content-Type', type);
    res.set('Cache-Control', 'no-store');
    res.send(buf);
  } catch {
    res.status(502).end();
  }
}

module.exports = { getReviews, streamAvatar, usage, monthlyLimit };
