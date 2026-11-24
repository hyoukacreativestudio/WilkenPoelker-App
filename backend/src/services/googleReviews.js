const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
// A daily share of it (twice the average day) stops a flood of page views from
// using up the whole month in minutes; the route also has a per-IP limit.

const API = 'https://places.googleapis.com/v1';
const QUERY = 'Wilken Poelker GmbH & Co. KG, Langholter Straße 43, 26842 Ostrhauderfehn';
const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'google-reviews-state.json');
// Only Google's avatar host may be passed through the avatar route
const AVATAR_HOST = /^https:\/\/lh\d\.googleusercontent\.com\//;

const key = () => (process.env.GOOGLE_PLACES_API_KEY || '').trim();
const monthlyLimit = () => Math.max(0, parseInt(process.env.GOOGLE_REVIEWS_MONTHLY_LIMIT || '900', 10) || 0);
const dailyLimit = () => Math.ceil((monthlyLimit() / 30) * 2);
const monthOf = (d = new Date()) => d.toISOString().slice(0, 7);
const dayOf = (d = new Date()) => d.toISOString().slice(0, 10);

// Avatar links carry a signature, so the avatar route only passes through the
// pictures this server handed out itself (it is not an open image proxy)
const sign = (url) => crypto.createHmac('sha256', `avatar:${process.env.JWT_SECRET || ''}`).update(url).digest('base64url').slice(0, 22);
function signatureOk(url, sig) {
  const want = Buffer.from(sign(url));
  const got = Buffer.from(String(sig || ''));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

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
function usageToday() {
  const s = readState();
  return s.day === dayOf() ? (s.dayCalls || 0) : 0;
}
function countCall() {
  const s = readState();
  const month = monthOf();
  const day = dayOf();
  if (s.month !== month) { s.month = month; s.calls = 0; }
  if (s.day !== day) { s.day = day; s.dayCalls = 0; }
  s.calls = (s.calls || 0) + 1;
  s.dayCalls = (s.dayCalls || 0) + 1;
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
  if (usage() >= monthlyLimit() || usageToday() >= dailyLimit()) {
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
          ? `/api/website/reviews/avatar?u=${encodeURIComponent(r.authorAttribution.photoUri)}&s=${sign(r.authorAttribution.photoUri)}` : null,
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

const AVATAR_TYPES = /^image\/(jpeg|png|webp|gif)\b/i; // no SVG (it can carry script)
const AVATAR_MAX = 300 * 1024;

// Passes the author's avatar through (not stored). Only Google's avatar host,
// only links this server signed, no redirects, at most 300 KB.
async function streamAvatar(rawUrl, sig, res) {
  const url = String(rawUrl || '');
  if (!AVATAR_HOST.test(url) || !signatureOk(url, sig)) { res.status(400).end(); return; }
  try {
    const r = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(6000) });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !AVATAR_TYPES.test(type) || !r.body) { res.status(404).end(); return; }
    if (Number(r.headers.get('content-length') || 0) > AVATAR_MAX) { res.status(413).end(); return; }
    const chunks = [];
    let size = 0;
    for await (const chunk of r.body) {
      size += chunk.length;
      if (size > AVATAR_MAX) { res.status(413).end(); return; }
      chunks.push(chunk);
    }
    res.set('Content-Type', type);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store');
    res.send(Buffer.concat(chunks.map((c) => Buffer.from(c))));
  } catch {
    res.status(502).end();
  }
}

module.exports = { getReviews, streamAvatar, usage, usageToday, monthlyLimit, dailyLimit };
