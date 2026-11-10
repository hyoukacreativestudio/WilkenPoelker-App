jest.mock('../src/models', () => ({ User: {} }));
jest.mock('../src/services/authService', () => ({ forgotPassword: jest.fn(), resetPassword: jest.fn() }));
jest.mock('../src/services/emailService', () => ({ sendPasswordResetEmail: jest.fn(async () => {}) }));

const express = require('express');
const request = require('supertest');
const authService = require('../src/services/authService');
const emailService = require('../src/services/emailService');
const { forgotRouter } = require('../src/routes/resetPasswordPage');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use('/passwort-vergessen', forgotRouter);

describe('Passwort vergessen web page', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the form', async () => {
    const res = await request(app).get('/passwort-vergessen');
    expect(res.status).toBe(200);
    expect(res.text).toContain('name="email"');
  });

  it('sends the reset e-mail for a known address', async () => {
    authService.forgotPassword.mockResolvedValue({ email: 'kunde@test.de', name: 'Kunde', resetToken: 'abc' });
    const res = await request(app).post('/passwort-vergessen').type('form').send({ email: 'Kunde@Test.de ' });
    expect(res.status).toBe(200);
    expect(authService.forgotPassword).toHaveBeenCalledWith('Kunde@Test.de', {});
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith('kunde@test.de', 'Kunde', 'abc');
    expect(res.text).toContain('Falls ein Konto');
  });

  it('gives the same answer for an unknown address and sends nothing', async () => {
    authService.forgotPassword.mockResolvedValue(undefined);
    const res = await request(app).post('/passwort-vergessen').type('form').send({ email: 'niemand@test.de' });
    expect(res.text).toContain('Falls ein Konto');
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('rejects an invalid address', async () => {
    const res = await request(app).post('/passwort-vergessen').type('form').send({ email: 'kein-at' });
    expect(res.status).toBe(400);
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });
});
