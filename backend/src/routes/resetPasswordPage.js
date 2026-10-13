const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService');
const { User } = require('../models');
const { PASSWORD_RULES } = require('../middlewares/validate');

// Web page behind the link in the "Passwort zurücksetzen" e-mail
// (https://api.wilkenpoelker.de/reset-password?token=...). It works in any
// browser without the app or deep links: a plain HTML form, no JavaScript.
const router = express.Router();

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Separate from the API limiter so a typo on this page cannot lock the
// customer out; tokens are 64 hex chars, so guessing is not a concern.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).type('html').send(page({
    title: 'Zu viele Versuche',
    body: '<p>Bitte warten Sie eine Stunde und versuchen Sie es dann erneut.</p>',
  })),
});

function page({ title, body }) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)} – WilkenPoelker</title>
<style>
  body{margin:0;background:#f7f6f0;color:#15271b;font:17px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  main{max-width:460px;margin:0 auto;padding:40px 20px 64px}
  header{border-bottom:3px solid #43AC34;padding-bottom:12px;margin-bottom:22px}
  .brand{font-weight:800;color:#2f8a26;letter-spacing:.04em;text-transform:uppercase;font-size:13px}
  h1{font-size:28px;line-height:1.2;margin:6px 0 0}
  p{margin:0 0 14px;color:#2c3a30}
  label{display:block;font-weight:600;margin:16px 0 6px}
  input[type=password]{box-sizing:border-box;width:100%;font:inherit;padding:12px 14px;border:1px solid #b9c9b4;border-radius:10px;background:#fff}
  input[type=password]:focus{outline:2px solid #43AC34;border-color:#43AC34}
  .hint{font-size:14px;color:#5b6b5d;margin-top:8px}
  .error{background:#fdecea;color:#8a1c12;border-radius:10px;padding:12px 14px;margin-bottom:6px}
  .ok{background:#e7f4e4;color:#1d5c17;border-radius:10px;padding:12px 14px}
  button{width:100%;margin-top:22px;font:inherit;font-weight:700;color:#fff;background:#2E7D32;border:0;border-radius:10px;padding:14px;cursor:pointer}
  footer{margin-top:36px;color:#6c7a6c;font-size:14px}
</style>
</head>
<body>
<main>
  <header>
    <div class="brand">WilkenPoelker App</div>
    <h1>${escapeHtml(title)}</h1>
  </header>
  ${body}
  <footer>Wilken Poelker GmbH &amp; Co. KG · Telefon 04952 5304 · info@wilkenpoelker.de</footer>
</main>
</body>
</html>`;
}

function formPage(token, error) {
  return page({
    title: 'Neues Passwort festlegen',
    body: `${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
  <form method="post" action="">
    <input type="hidden" name="token" value="${escapeHtml(token)}">
    <label for="password">Neues Passwort</label>
    <input id="password" name="password" type="password" autocomplete="new-password" required minlength="8">
    <label for="passwordConfirm">Passwort wiederholen</label>
    <input id="passwordConfirm" name="passwordConfirm" type="password" autocomplete="new-password" required minlength="8">
    <p class="hint">Mindestens 8 Zeichen, mit Groß- und Kleinbuchstaben, einer Zahl und einem Sonderzeichen.</p>
    <button type="submit">Passwort speichern</button>
  </form>`,
  });
}

const invalidLinkPage = () => page({
  title: 'Link ungültig',
  body: '<p class="error">Dieser Link ist ungültig oder abgelaufen (Links gelten 1 Stunde).</p>'
    + '<p>Bitte fordern Sie in der App unter „Passwort vergessen?“ einen neuen Link an.</p>',
});

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

// GET /reset-password?token=...  (also /reset-password/<token>)
router.get(['/', '/:token'], (req, res) => {
  noStore(res);
  const token = String(req.params.token || req.query.token || '');
  if (!/^[0-9a-f]{64}$/i.test(token)) return res.status(400).type('html').send(invalidLinkPage());
  res.type('html').send(formPage(token));
});

router.post(['/', '/:token'], submitLimiter, async (req, res, next) => {
  noStore(res);
  const token = String(req.body.token || req.params.token || '');
  const password = String(req.body.password || '');
  const passwordConfirm = String(req.body.passwordConfirm || '');
  if (!/^[0-9a-f]{64}$/i.test(token)) return res.status(400).type('html').send(invalidLinkPage());

  const weak = PASSWORD_RULES.find((rule) => !rule.test(password));
  if (weak) return res.status(400).type('html').send(formPage(token, weak.de));
  if (password !== passwordConfirm) {
    return res.status(400).type('html').send(formPage(token, 'Die Passwörter stimmen nicht überein.'));
  }

  try {
    await authService.resetPassword(token, password, User);
  } catch (err) {
    if (err.code === 'INVALID_RESET_TOKEN' || err.code === 'RESET_TOKEN_EXPIRED') {
      return res.status(400).type('html').send(invalidLinkPage());
    }
    return next(err);
  }
  res.type('html').send(page({
    title: 'Passwort geändert',
    body: '<p class="ok">Ihr neues Passwort ist gespeichert.</p>'
      + '<p>Sie können sich jetzt in der WilkenPoelker-App mit Ihrem neuen Passwort anmelden. '
      + 'Aus Sicherheitsgründen wurden Sie auf allen Geräten abgemeldet.</p>',
  }));
});

module.exports = router;
