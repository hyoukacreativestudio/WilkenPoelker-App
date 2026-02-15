export const validators = {
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  isValidPassword: (password) => {
    if (!password || password.length < 8) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/\d/.test(password)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
    return true;
  },

  getPasswordStrength: (password) => {
    if (!password) return { score: 0, label: 'empty', color: '#E0E0E0' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 1) return { score, label: 'weak', color: '#F44336' };
    if (score <= 2) return { score, label: 'fair', color: '#FF9800' };
    if (score <= 3) return { score, label: 'good', color: '#FFC107' };
    if (score <= 4) return { score, label: 'strong', color: '#4CAF50' };
    return { score, label: 'veryStrong', color: '#2E7D32' };
  },

  isValidCustomerNumber: (num) => /^\d{4,}$/.test(num),

  isValidPhone: (phone) => !phone || /^[+]?[\d\s()-]{6,20}$/.test(phone),

  isValidUsername: (username) =>
    /^[a-zA-Z0-9_-]{3,30}$/.test(username),

  isValidZip: (zip) => /^\d{5}$/.test(zip),
};

export const getValidationErrors = (fields) => {
  const errors = {};

  if (fields.email !== undefined && !validators.isValidEmail(fields.email)) {
    errors.email = 'invalidEmail';
  }

  if (fields.password !== undefined && !validators.isValidPassword(fields.password)) {
    errors.password = 'weakPassword';
  }

  if (fields.passwordConfirm !== undefined && fields.password !== fields.passwordConfirm) {
    errors.passwordConfirm = 'passwordMismatch';
  }

  if (fields.username !== undefined && !validators.isValidUsername(fields.username)) {
    errors.username = 'invalidUsername';
  }

  if (fields.customerNumber !== undefined && !validators.isValidCustomerNumber(fields.customerNumber)) {
    errors.customerNumber = 'invalidCustomerNumber';
  }

  return errors;
};
