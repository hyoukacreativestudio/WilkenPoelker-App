const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { syncImages, UPLOADS } = require('../src/services/shop/enrich/http');

const FOLDER = `jest-recheck-${process.pid}`;
const dir = path.join(UPLOADS, 'shop', FOLDER);
const files = () => fs.readdirSync(dir).sort();

const png = (color) => sharp({ create: { width: 8, height: 8, channels: 3, background: color } }).png().toBuffer();

// A public address (documentation range, never really contacted: fetch is
// mocked), so the SSRF check of politeFetch lets it through without DNS
const HOST = 'https://203.0.113.10';
const A = `${HOST}/a.jpg`;
const B = `${HOST}/b.jpg`;

let served;
beforeAll(() => {
  global.fetch = jest.fn(async (url) => {
    const r = served[url];
    const headers = { get: () => null };
    if (typeof r === 'number') return { ok: false, status: r, headers };
    return { ok: true, status: 200, headers, body: [r] };
  });
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('monthly picture check', () => {
  let current;

  test('first run stores the pictures', async () => {
    served = { [A]: await png('#ff0000'), [B]: await png('#00ff00') };
    const r = await syncImages(FOLDER, Object.keys(served), 'x', []);
    expect(r.images).toHaveLength(2);
    expect(files()).toEqual(['1-k.webp', '1.webp', '2-k.webp', '2.webp']);
    current = r.images;
  }, 20000);

  test('same pictures: nothing changed', async () => {
    const r = await syncImages(FOLDER, Object.keys(served), 'x', current);
    expect(r.changed).toBe(false);
  }, 20000);

  test('a new version at the same address is taken over', async () => {
    served[A] = await png('#0000ff');
    const r = await syncImages(FOLDER, Object.keys(served), 'x', current);
    expect(r.changed).toBe(true);
    expect(r.images[0].hash).not.toBe(current[0].hash);
    current = r.images;
  }, 20000);

  test('a removed picture is deleted from the server', async () => {
    served[A] = 404;
    const r = await syncImages(FOLDER, Object.keys(served), 'x', current);
    expect(r.changed).toBe(true);
    expect(r.images.map((i) => i.original)).toEqual([B]);
    expect(files()).toEqual(['1-k.webp', '1.webp']);
    current = r.images;
  }, 20000);

  test('a bot check or server error changes nothing', async () => {
    for (const status of [403, 500, 503]) {
      served[B] = status;
      const r = await syncImages(FOLDER, [B], 'x', current);
      expect(r).toEqual({ unknown: true });
      expect(files()).toEqual(['1-k.webp', '1.webp']);
    }
  }, 20000);

  test('internal addresses are never fetched (SSRF)', async () => {
    global.fetch.mockClear();
    for (const url of ['http://127.0.0.1/a.jpg', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/a.jpg', 'http://192.168.1.1/a.jpg', 'file:///etc/passwd']) {
      const r = await syncImages(FOLDER, [url], 'x', current);
      expect(r).toEqual({ unknown: true });
    }
    expect(global.fetch).not.toHaveBeenCalled();
    expect(files()).toEqual(['1-k.webp', '1.webp']);
  }, 20000);

  test('product gone: all its pictures are removed', async () => {
    const r = await syncImages(FOLDER, [], 'x', current);
    expect(r.images).toEqual([]);
    expect(files()).toEqual([]);
  }, 20000);
});
