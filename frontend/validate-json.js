try {
  JSON.parse(require('fs').readFileSync('./src/i18n/de.json', 'utf8'));
  console.log('de.json: VALID');
} catch(e) {
  console.log('de.json: INVALID -', e.message);
}
try {
  JSON.parse(require('fs').readFileSync('./src/i18n/en.json', 'utf8'));
  console.log('en.json: VALID');
} catch(e) {
  console.log('en.json: INVALID -', e.message);
}
process.exit(0);
