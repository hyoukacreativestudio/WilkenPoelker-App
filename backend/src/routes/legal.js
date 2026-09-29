const express = require('express');
const fs = require('fs');
const path = require('path');

// Public privacy policy of the app as a web page (App Store Connect / Google Play
// need a URL). The text is the same one the app shows: it is read from the
// app's own translation files, so there is only one source to maintain.
const I18N_DIR = path.resolve(__dirname, '../../../frontend/src/i18n');

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function loadPolicy(lang) {
  const file = path.join(I18N_DIR, `${lang}.json`);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  return json.legal && json.legal.datenschutz;
}

function renderPage(policy, lang) {
  const sections = [];
  for (let i = 1; policy[`section${i}Title`]; i += 1) {
    const paragraphs = String(policy[`section${i}Content`] || '')
      .split(/\n{2,}/)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
      .join('\n');
    sections.push(`<h2>${escapeHtml(policy[`section${i}Title`])}</h2>\n${paragraphs}`);
  }
  const other = lang === 'de'
    ? '<a href="?lang=en">English version</a>'
    : '<a href="?lang=de">Deutsche Fassung</a>';
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(policy.title)} – WilkenPoelker App</title>
<meta name="robots" content="index, follow">
<style>
  body{margin:0;background:#f7f6f0;color:#15271b;font:17px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  main{max-width:820px;margin:0 auto;padding:40px 20px 64px}
  header{border-bottom:3px solid #43AC34;padding-bottom:14px;margin-bottom:8px}
  .brand{font-weight:800;color:#2f8a26;letter-spacing:.04em;text-transform:uppercase;font-size:13px}
  h1{font-size:32px;line-height:1.15;margin:6px 0 4px}
  .sub{color:#3f4f43;margin:0}
  h2{font-size:21px;margin:34px 0 8px}
  p{margin:0 0 12px;color:#2c3a30}
  a{color:#1f6b1a}
  footer{margin-top:40px;color:#6c7a6c;font-size:14px}
</style>
</head>
<body>
<main>
  <header>
    <div class="brand">WilkenPoelker App</div>
    <h1>${escapeHtml(policy.title)}</h1>
    <p class="sub">${escapeHtml(policy.subtitle || '')}</p>
  </header>
  ${sections.join('\n  ')}
  <footer>${escapeHtml(policy.lastUpdated || '')} · ${other}</footer>
</main>
</body>
</html>`;
}

const router = express.Router();

// GET /datenschutz  (optional ?lang=en)
router.get('/', (req, res, next) => {
  try {
    const lang = req.query.lang === 'en' ? 'en' : 'de';
    const policy = loadPolicy(lang);
    if (!policy) return res.status(404).send('Not found');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.type('html').send(renderPage(policy, lang));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
