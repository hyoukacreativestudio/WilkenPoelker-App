import { validators, getValidationErrors } from '../validators';

describe('validators', () => {
  describe('isValidEmail', () => {
    it('accepts valid emails', () => {
      expect(validators.isValidEmail('user@example.com')).toBe(true);
      expect(validators.isValidEmail('info@wilkenpoelker.de')).toBe(true);
      expect(validators.isValidEmail('a.b@c.de')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(validators.isValidEmail('')).toBe(false);
      expect(validators.isValidEmail('notanemail')).toBe(false);
      expect(validators.isValidEmail('missing@')).toBe(false);
      expect(validators.isValidEmail('@nodomain.com')).toBe(false);
      expect(validators.isValidEmail('spaces in@email.com')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('accepts valid passwords', () => {
      expect(validators.isValidPassword('Test1234!')).toBe(true);
      expect(validators.isValidPassword('MyP@ssw0rd')).toBe(true);
      expect(validators.isValidPassword('Abcdefg1!')).toBe(true);
    });

    it('rejects passwords shorter than 8 chars', () => {
      expect(validators.isValidPassword('Ab1!')).toBe(false);
      expect(validators.isValidPassword('Aa1!aaa')).toBe(false);
    });

    it('rejects passwords without lowercase', () => {
      expect(validators.isValidPassword('ABCDEFG1!')).toBe(false);
    });

    it('rejects passwords without uppercase', () => {
      expect(validators.isValidPassword('abcdefg1!')).toBe(false);
    });

    it('rejects passwords without digit', () => {
      expect(validators.isValidPassword('Abcdefgh!')).toBe(false);
    });

    it('rejects passwords without special char', () => {
      expect(validators.isValidPassword('Abcdefg1a')).toBe(false);
    });

    it('rejects null/undefined', () => {
      expect(validators.isValidPassword(null)).toBe(false);
      expect(validators.isValidPassword(undefined)).toBe(false);
      expect(validators.isValidPassword('')).toBe(false);
    });
  });

  describe('getPasswordStrength', () => {
    it('returns empty for no password', () => {
      expect(validators.getPasswordStrength('')).toEqual({
        score: 0,
        label: 'empty',
        color: '#E0E0E0',
      });
      expect(validators.getPasswordStrength(null)).toEqual({
        score: 0,
        label: 'empty',
        color: '#E0E0E0',
      });
    });

    it('returns weak for short simple passwords', () => {
      const result = validators.getPasswordStrength('abc');
      expect(result.label).toBe('weak');
    });

    it('returns veryStrong for long complex passwords', () => {
      const result = validators.getPasswordStrength('MyStr0ng!Pass');
      expect(result.label).toBe('veryStrong');
      expect(result.score).toBe(5);
    });

    it('increases score with length', () => {
      const short = validators.getPasswordStrength('Aa1!aaaa');
      const long = validators.getPasswordStrength('Aa1!aaaabbbb');
      expect(long.score).toBeGreaterThan(short.score);
    });
  });

  describe('isValidCustomerNumber', () => {
    it('accepts 4+ digit numbers', () => {
      expect(validators.isValidCustomerNumber('1234')).toBe(true);
      expect(validators.isValidCustomerNumber('12345678')).toBe(true);
    });

    it('rejects short numbers', () => {
      expect(validators.isValidCustomerNumber('123')).toBe(false);
      expect(validators.isValidCustomerNumber('')).toBe(false);
    });

    it('rejects non-digit characters', () => {
      expect(validators.isValidCustomerNumber('12ab')).toBe(false);
      expect(validators.isValidCustomerNumber('1234a')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('accepts valid phone numbers', () => {
      expect(validators.isValidPhone('+49 4952 5304')).toBe(true);
      expect(validators.isValidPhone('04952-5304')).toBe(true);
      expect(validators.isValidPhone('(049) 525304')).toBe(true);
    });

    it('accepts empty (optional field)', () => {
      expect(validators.isValidPhone('')).toBe(true);
      expect(validators.isValidPhone(undefined)).toBe(true);
    });

    it('rejects too short numbers', () => {
      expect(validators.isValidPhone('123')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('accepts valid usernames', () => {
      expect(validators.isValidUsername('user123')).toBe(true);
      expect(validators.isValidUsername('my-user')).toBe(true);
      expect(validators.isValidUsername('my_user')).toBe(true);
      expect(validators.isValidUsername('abc')).toBe(true);
    });

    it('rejects too short usernames', () => {
      expect(validators.isValidUsername('ab')).toBe(false);
    });

    it('rejects too long usernames', () => {
      expect(validators.isValidUsername('a'.repeat(31))).toBe(false);
    });

    it('rejects special characters', () => {
      expect(validators.isValidUsername('user@name')).toBe(false);
      expect(validators.isValidUsername('user name')).toBe(false);
    });
  });

  describe('isValidZip', () => {
    it('accepts 5-digit German ZIP codes', () => {
      expect(validators.isValidZip('26842')).toBe(true);
      expect(validators.isValidZip('01234')).toBe(true);
    });

    it('rejects non-5-digit strings', () => {
      expect(validators.isValidZip('1234')).toBe(false);
      expect(validators.isValidZip('123456')).toBe(false);
      expect(validators.isValidZip('abcde')).toBe(false);
    });
  });
});

describe('getValidationErrors', () => {
  it('returns empty object for valid fields', () => {
    expect(getValidationErrors({
      email: 'test@test.de',
      password: 'Test1234!',
      passwordConfirm: 'Test1234!',
      username: 'testuser',
      customerNumber: '12345',
    })).toEqual({});
  });

  it('returns email error for invalid email', () => {
    const errors = getValidationErrors({ email: 'invalid' });
    expect(errors.email).toBe('invalidEmail');
  });

  it('returns password error for weak password', () => {
    const errors = getValidationErrors({ password: '123' });
    expect(errors.password).toBe('weakPassword');
  });

  it('returns mismatch error for different passwords', () => {
    const errors = getValidationErrors({
      password: 'Test1234!',
      passwordConfirm: 'Different1!',
    });
    expect(errors.passwordConfirm).toBe('passwordMismatch');
  });

  it('returns username error for invalid username', () => {
    const errors = getValidationErrors({ username: 'a' });
    expect(errors.username).toBe('invalidUsername');
  });

  it('returns customerNumber error for invalid number', () => {
    const errors = getValidationErrors({ customerNumber: '12' });
    expect(errors.customerNumber).toBe('invalidCustomerNumber');
  });

  it('only validates provided fields', () => {
    const errors = getValidationErrors({ email: 'valid@test.de' });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});
