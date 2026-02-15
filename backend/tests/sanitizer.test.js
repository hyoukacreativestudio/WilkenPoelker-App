const { sanitizeString, sanitizeObject } = require('../src/utils/sanitizer');

describe('Sanitizer', () => {
  describe('sanitizeString', () => {
    it('should strip script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(sanitizeString(input)).toBe('Hello');
    });

    it('should strip style tags', () => {
      const input = '<style>body{display:none}</style>Content';
      expect(sanitizeString(input)).toBe('Content');
    });

    it('should strip HTML tags', () => {
      const input = '<div onclick="alert(1)">Text</div>';
      expect(sanitizeString(input)).not.toContain('onclick');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should return non-string values unchanged', () => {
      expect(sanitizeString(42)).toBe(42);
      expect(sanitizeString(null)).toBe(null);
      expect(sanitizeString(undefined)).toBe(undefined);
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in an object', () => {
      const input = {
        name: '<script>alert(1)</script>John',
        age: 25,
        bio: '<b>Bold</b> text',
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.age).toBe(25);
      expect(result.bio).not.toContain('<b>');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<script>xss</script>Jane',
        },
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('Jane');
    });

    it('should handle arrays', () => {
      const input = ['<script>xss</script>A', 'B', '<img onerror="alert(1)">'];
      const result = sanitizeObject(input);
      expect(result[0]).toBe('A');
      expect(result[1]).toBe('B');
    });

    it('should return null/undefined unchanged', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });
  });
});
