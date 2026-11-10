const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config/env');

// A small app with the real limiter but a low limit, so the test is fast.
function appWith(max) {
  jest.resetModules();
  const rateLimit = require('express-rate-limit');
  const original = rateLimit.rateLimit || rateLimit;
  jest.doMock('express-rate-limit', () => {
    const wrapped = (opts) => original({ ...opts, max: opts.max === 300 ? max : opts.max });
    wrapped.ipKeyGenerator = rateLimit.ipKeyGenerator;
    wrapped.rateLimit = wrapped;
    return wrapped;
  });
  const { apiLimiter } = require('../src/middlewares/rateLimit');
  const app = express();
  app.set('trust proxy', 1);
  app.use('/api/', apiLimiter);
  app.get('/api/x', (req, res) => res.json({ ok: true }));
  return app;
}
const token = (id) => jwt.sign({ id, role: 'customer' }, config.jwt.secret, { expiresIn: '15m' });

afterEach(() => jest.dontMock('express-rate-limit'));

describe('API rate limit per user, not per shared IP', () => {
  it('two users behind the same IP each get their own budget', async () => {
    const app = appWith(3);
    const a = token('user-a'); const b = token('user-b');
    for (let i = 0; i < 3; i += 1) {
      expect((await request(app).get('/api/x').set('Authorization', `Bearer ${a}`)).status).toBe(200);
    }
    expect((await request(app).get('/api/x').set('Authorization', `Bearer ${a}`)).status).toBe(429);
    expect((await request(app).get('/api/x').set('Authorization', `Bearer ${b}`)).status).toBe(200);
  });

  it('a forged token falls back to the IP budget', async () => {
    const app = appWith(2);
    const forged = jwt.sign({ id: 'x' }, 'wrong-secret');
    expect((await request(app).get('/api/x').set('Authorization', `Bearer ${forged}`)).status).toBe(200);
    expect((await request(app).get('/api/x')).status).toBe(200);
    expect((await request(app).get('/api/x').set('Authorization', `Bearer ${forged}`)).status).toBe(429);
  });
});
