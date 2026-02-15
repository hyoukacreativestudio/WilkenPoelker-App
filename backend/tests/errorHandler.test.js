const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
} = require('../src/middlewares/errorHandler');

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with statusCode and code', () => {
      const err = new AppError('Test error', 400, 'TEST_ERROR');
      expect(err.message).toBe('Test error');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('TEST_ERROR');
      expect(err.isOperational).toBe(true);
    });

    it('should default code to UNKNOWN_ERROR', () => {
      const err = new AppError('Test', 500);
      expect(err.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should have status 400 and validation errors', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const err = new ValidationError(errors);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.errors).toEqual(errors);
    });
  });

  describe('AuthenticationError', () => {
    it('should have status 401', () => {
      const err = new AuthenticationError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should accept custom message', () => {
      const err = new AuthenticationError('Token expired');
      expect(err.message).toBe('Token expired');
    });
  });

  describe('AuthorizationError', () => {
    it('should have status 403', () => {
      const err = new AuthorizationError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should have status 404 with resource name', () => {
      const err = new NotFoundError('User');
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('User not found');
    });

    it('should default to Resource', () => {
      const err = new NotFoundError();
      expect(err.message).toBe('Resource not found');
    });
  });

  describe('RateLimitError', () => {
    it('should have status 429', () => {
      const err = new RateLimitError();
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
