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

// ── Account deletion request page (Google Play "delete account URL") ──
const DELETE_ACCOUNT = {
  de: {
    title: 'Konto und Daten löschen',
    subtitle: 'WilkenPoelker App – Wilken Poelker GmbH & Co. KG',
    lastUpdated: 'Stand: September 2026',
    section1Title: 'In der App (sofort)',
    section1Content: 'Öffnen Sie die App und gehen Sie zu „Profil“ → „Konto löschen“. Geben Sie zur Bestätigung Ihr Passwort ein. Ihr Konto und die zugehörigen Daten werden sofort gelöscht.\n\nAlternativ: „Mehr“ → „Einstellungen“ → „Meine Daten löschen“.',
    section2Title: 'Ohne App (per E-Mail)',
    section2Content: 'Schreiben Sie von der E-Mail-Adresse, mit der Sie registriert sind, eine E-Mail an info@wilkenpoelker.de mit dem Betreff „Konto löschen“. Wir löschen Ihr Konto innerhalb von 30 Tagen und bestätigen Ihnen die Löschung.',
    section3Title: 'Welche Daten werden gelöscht?',
    section3Content: 'Gelöscht werden Ihr Benutzerkonto (Name, E-Mail-Adresse, Telefonnummer, Anschrift, Profilbild), Ihre Termine, Service-Anfragen und Chat-Nachrichten, Kommentare und „Gefällt mir“-Angaben, Benachrichtigungen, Geräte-Token für Push-Nachrichten sowie Verläufe des KI-Assistenten.',
    section4Title: 'Was bleibt erhalten?',
    section4Content: 'Daten, die wir aufgrund gesetzlicher Aufbewahrungspflichten speichern müssen (z. B. Rechnungen und Aufträge in unserer Warenwirtschaft), bleiben für die gesetzliche Frist erhalten – in der Regel bis zu 10 Jahre – und werden danach gelöscht.',
    section5Title: 'Fragen',
    section5Content: 'Wilken Poelker GmbH & Co. KG, Langholter Straße 43, 26842 Ostrhauderfehn\nTelefon: 04952 5304 · E-Mail: info@wilkenpoelker.de\nDatenschutz: datenschutz@wilkenpoelker.de',
  },
  en: {
    title: 'Delete account and data',
    subtitle: 'WilkenPoelker App – Wilken Poelker GmbH & Co. KG',
    lastUpdated: 'Last updated: September 2026',
    section1Title: 'In the app (immediately)',
    section1Content: 'Open the app and go to "Profile" → "Delete account". Enter your password to confirm. Your account and related data are deleted immediately.\n\nAlternatively: "More" → "Settings" → "Delete my data".',
    section2Title: 'Without the app (by email)',
    section2Content: 'Send an email from the address you registered with to info@wilkenpoelker.de with the subject "Delete account". We will delete your account within 30 days and confirm the deletion.',
    section3Title: 'Which data is deleted?',
    section3Content: 'Your user account (name, email address, phone number, postal address, profile picture), your appointments, service requests and chat messages, comments and likes, notifications, push notification device tokens and AI assistant histories.',
    section4Title: 'What is kept?',
    section4Content: 'Data we must keep because of statutory retention obligations (e.g. invoices and orders in our merchandise management system) is kept for the statutory period – usually up to 10 years – and deleted afterwards.',
    section5Title: 'Questions',
    section5Content: 'Wilken Poelker GmbH & Co. KG, Langholter Straße 43, 26842 Ostrhauderfehn, Germany\nPhone: +49 4952 5304 · Email: info@wilkenpoelker.de\nData protection: datenschutz@wilkenpoelker.de',
  },
};

const deleteAccountRouter = express.Router();
deleteAccountRouter.get('/', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'de';
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('html').send(renderPage(DELETE_ACCOUNT[lang], lang));
});

module.exports = router;
module.exports.deleteAccountRouter = deleteAccountRouter;
