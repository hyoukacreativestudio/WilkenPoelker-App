const request = require('supertest');

// We test against the running server to avoid complex DB setup
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5002';

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(BASE_URL).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('WilkenPoelker API is running');
      expect(res.body.database).toBe('ok');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('environment');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(BASE_URL).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Auth Endpoints', () => {
    describe('POST /api/auth/login', () => {
      it('should reject login without credentials', async () => {
        const res = await request(BASE_URL)
          .post('/api/auth/login')
          .send({});
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should reject login with wrong password', async () => {
        const res = await request(BASE_URL)
          .post('/api/auth/login')
          .send({ email: 'admin@wilkenpoelker.de', password: 'wrongpassword' });
        expect([400, 401]).toContain(res.status);
        expect(res.body.success).toBe(false);
      });

      it('should login with valid credentials', async () => {
        const res = await request(BASE_URL)
          .post('/api/auth/login')
          .send({ email: 'admin@wilkenpoelker.de', password: 'Test1234!' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');
        expect(res.body.data).toHaveProperty('user');
      });
    });

    describe('POST /api/auth/register', () => {
      it('should reject registration without required fields', async () => {
        const res = await request(BASE_URL)
          .post('/api/auth/register')
          .send({});
        // 400 for validation error, or 429 if rate limited
        expect([400, 429]).toContain(res.status);
        expect(res.body.success).toBe(false);
      });

      it('should reject weak passwords', async () => {
        const res = await request(BASE_URL)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email: 'test@test.com',
            password: '123',
            passwordConfirm: '123',
            dsgvoAccepted: true,
          });
        // 400 for validation error, or 429 if rate limited
        expect([400, 429]).toContain(res.status);
      });
    });

    describe('POST /api/auth/refresh-token', () => {
      it('should reject without refresh token', async () => {
        const res = await request(BASE_URL)
          .post('/api/auth/refresh-token')
          .send({});
        expect(res.status).toBe(400);
      });

      it('should reject invalid refresh token', async () => {
        const res = await request(BASE_URL)
          .post('/api/auth/refresh-token')
          .send({ refreshToken: 'invalid-token' });
        expect([400, 401]).toContain(res.status);
      });
    });
  });

  describe('Protected Endpoints (without auth)', () => {
    it('GET /api/users/profile should require auth', async () => {
      const res = await request(BASE_URL).get('/api/users/profile');
      expect(res.status).toBe(401);
    });

    it('GET /api/feed should require auth', async () => {
      const res = await request(BASE_URL).get('/api/feed');
      expect(res.status).toBe(401);
    });

    it('GET /api/repairs should require auth', async () => {
      const res = await request(BASE_URL).get('/api/repairs');
      expect(res.status).toBe(401);
    });

    it('GET /api/appointments should require auth', async () => {
      const res = await request(BASE_URL).get('/api/appointments');
      expect(res.status).toBe(401);
    });

    it('GET /api/notifications should require auth', async () => {
      const res = await request(BASE_URL).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('Authenticated Endpoints', () => {
    let token;

    beforeAll(async () => {
      const res = await request(BASE_URL)
        .post('/api/auth/login')
        .send({ email: 'admin@wilkenpoelker.de', password: 'Test1234!' });
      token = res.body.data?.accessToken;
    });

    it('GET /api/users/profile should return user profile', async () => {
      if (!token) return;
      const res = await request(BASE_URL)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('email');
      expect(res.body.data.user).toHaveProperty('role');
    });

    it('GET /api/feed should return posts', async () => {
      if (!token) return;
      const res = await request(BASE_URL)
        .get('/api/feed')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/repairs should return repairs', async () => {
      if (!token) return;
      const res = await request(BASE_URL)
        .get('/api/repairs')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/products should return products', async () => {
      if (!token) return;
      const res = await request(BASE_URL)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/appointments should return appointments', async () => {
      if (!token) return;
      const res = await request(BASE_URL)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/notifications should return notifications', async () => {
      if (!token) return;
      const res = await request(BASE_URL)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/service/tickets should return tickets', async () => {
      if (!token) return;
      const res = await request(BASE_URL)
        .get('/api/service/tickets')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/faq should return FAQ data', async () => {
      if (!token) return;
      const res = await request(BASE_URL)
        .get('/api/faq')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers from helmet', async () => {
      const res = await request(BASE_URL).get('/api/health');
      // Helmet sets these headers
      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
