const fs = require('fs');
const os = require('os');
const path = require('path');
const { scrub, pruneLogs } = require('../src/utils/logger');

describe('log privacy', () => {
  test('e-mail addresses keep only the first letter and the domain', () => {
    expect(scrub('Email sent to max.mustermann@example.de')).toBe('Email sent to m***@example.de');
    expect(scrub({ to: 'info@wilkenpoelker.de', subject: 'Hallo' })).toEqual({ to: 'i***@wilkenpoelker.de', subject: 'Hallo' });
    expect(scrub({ list: ['a.b@c.org'] })).toEqual({ list: ['a***@c.org'] });
  });

  test('IP addresses are shortened', () => {
    expect(scrub({ ip: '203.0.113.77' })).toEqual({ ip: '203.0.113.0' });
    expect(scrub({ ip: '::ffff:203.0.113.77' })).toEqual({ ip: '::ffff:203.0.113.0' });
    expect(scrub({ ip: '2001:db8:85a3:8d3:1319:8a2e:370:7348' })).toEqual({ ip: '2001:db8:85a3::' });
    expect(scrub('Request from 198.51.100.4 failed')).toBe('Request from 198.51.100.0 failed');
  });

  test('other values stay as they are', () => {
    expect(scrub({ userId: 'abc', count: 3, ok: true, when: '2026-11-24 10:30:00' })).toEqual({ userId: 'abc', count: 3, ok: true, when: '2026-11-24 10:30:00' });
    const err = new Error('x');
    expect(scrub({ error: err }).error).toBe(err);
  });

  test('old log files are removed and old lines cut', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-logs-'));
    const now = new Date(2026, 10, 24, 12, 0, 0).getTime();
    const line = (d) => JSON.stringify({ level: 'info', message: 'x', timestamp: d });
    fs.writeFileSync(path.join(dir, 'combined7.log'), `${line('2026-10-01 08:00:00')}\n`);
    fs.utimesSync(path.join(dir, 'combined7.log'), new Date(2026, 9, 1), new Date(2026, 9, 1));
    fs.writeFileSync(path.join(dir, 'combined.log'), `${line('2026-11-01 08:00:00')}\n${line('2026-11-20 08:00:00')}\n`);
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'bleibt');
    fs.utimesSync(path.join(dir, 'notes.txt'), new Date(2026, 0, 1), new Date(2026, 0, 1));

    const r = pruneLogs({ dir, days: 14, now });
    expect(r).toEqual({ removed: 1, trimmed: 1 });
    expect(fs.existsSync(path.join(dir, 'combined7.log'))).toBe(false);
    expect(fs.readFileSync(path.join(dir, 'combined.log'), 'utf8')).toBe(`${line('2026-11-20 08:00:00')}\n`);
    expect(fs.existsSync(path.join(dir, 'notes.txt'))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
