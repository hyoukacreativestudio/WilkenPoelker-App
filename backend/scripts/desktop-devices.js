// PCs that may use the PC program (see src/services/desktopDevices.js).
// Used by /root/pc-schutz-einrichten.sh; can also be run by hand on the server:
//
//   node scripts/desktop-devices.js list              all PCs and open codes
//   node scripts/desktop-devices.js code "Werkstatt"  new pairing code (24 h)
//   node scripts/desktop-devices.js revoke <id>       lock a PC (first 8 characters of the id are enough)
//   node scripts/desktop-devices.js hash-password     reads a password from stdin, prints its hash
//
// No output contains device keys; codes are shown once when they are created.

// The setup script reads this program's output (the hash, the codes); dotenv
// would otherwise print "injecting env ..." on stdout in front of it.
process.env.DOTENV_CONFIG_QUIET = 'true';

const { sequelize } = require('../src/config/database');

function pad(v, n) {
  const s = String(v ?? '');
  return s.length >= n ? `${s.slice(0, n - 1)}…` : s + ' '.repeat(n - s.length);
}
const fmt = (d) => (d ? new Date(d).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
const STATUS = { paired: 'freigeschaltet', code: 'Code offen', revoked: 'gesperrt' };

async function readStdin() {
  let s = '';
  for await (const chunk of process.stdin) s += chunk;
  return s.replace(/\r?\n$/, '');
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const devices = require('../src/services/desktopDevices');

  if (cmd === 'hash-password') {
    // The API cleans every request body (utils/sanitizer.js: trims, strips
    // <...>), the password included. Hash it the way the login will see it.
    const { sanitizeString } = require('../src/utils/sanitizer');
    const pw = sanitizeString(await readStdin());
    if (pw.length < 10) { console.error('Das Passwort muss mindestens 10 Zeichen haben (ohne Leerzeichen am Rand und ohne <...>).'); process.exit(2); }
    process.stdout.write(`${devices.hashAdminPassword(pw)}\n`);
    return;
  }

  await sequelize.authenticate();
  // Creates the table on a server that has not started the new backend yet
  await require('../src/models').DesktopDevice.sync();

  if (cmd === 'list') {
    const rows = await devices.listDevices();
    if (!rows.length) { console.log('Noch kein PC freigeschaltet und kein Code offen.'); return; }
    console.log(`${pad('Id', 10)}${pad('PC', 24)}${pad('Status', 16)}${pad('Freigeschaltet', 19)}Zuletzt benutzt`);
    for (const r of rows) {
      const extra = r.status === 'code' ? `(Code gültig bis ${fmt(r.codeValidUntil)})` : fmt(r.lastSeenAt);
      console.log(`${pad(r.id.slice(0, 8), 10)}${pad(r.name, 24)}${pad(STATUS[r.status], 16)}${pad(fmt(r.pairedAt), 19)}${extra}`);
    }
    return;
  }

  if (cmd === 'code') {
    const { code, device } = await devices.createPairingCode(args.join(' ') || 'PC', 'server');
    console.log(`${pad(device.name, 24)}${code}   (gültig bis ${fmt(device.pairingExpiresAt)})`);
    return;
  }

  if (cmd === 'revoke') {
    const prefix = String(args[0] || '').toLowerCase();
    if (prefix.length < 8) { console.error('Bitte die Id angeben (mindestens die ersten 8 Zeichen, siehe "list").'); process.exit(2); }
    const rows = (await devices.listDevices()).filter((r) => r.id.startsWith(prefix) && r.status !== 'revoked');
    if (rows.length !== 1) { console.error(rows.length ? 'Die Id passt zu mehreren Einträgen.' : 'Kein aktiver Eintrag mit dieser Id.'); process.exit(2); }
    await devices.revokeDevice(rows[0].id);
    console.log(`Gesperrt: ${rows[0].name}`);
    return;
  }

  console.error('Befehle: list | code "<Name>" | revoke <id> | hash-password');
  process.exit(2);
}

main()
  .then(() => sequelize.close().catch(() => {}))
  .catch((e) => { console.error(`Fehler: ${e.message}`); sequelize.close().catch(() => {}); process.exit(1); });
