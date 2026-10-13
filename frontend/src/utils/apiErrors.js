// Server errors are technical and often English - turn the known ones into the
// app's language. Unknown 4xx messages are passed through (most are German).
const CODE_KEYS = {
  EMAIL_EXISTS: 'errors.emailExists',
  USERNAME_EXISTS: 'errors.usernameExists',
  INVALID_CREDENTIALS: 'errors.invalidCredentials',
  ACCOUNT_DEACTIVATED: 'errors.accountDeactivated',
  EMAIL_NOT_VERIFIED: 'auth.emailNotVerified',
  RATE_LIMIT_EXCEEDED: 'errors.tooManyRequests',
  INVALID_RESET_TOKEN: 'errors.resetLinkInvalid',
  RESET_TOKEN_EXPIRED: 'errors.resetLinkInvalid',
  INVALID_PASSWORD: 'errors.wrongCurrentPassword',
};

const FIELD_KEYS = {
  email: 'errors.invalidEmail',
  password: 'errors.invalidPassword',
  newPassword: 'errors.invalidPassword',
  passwordConfirm: 'errors.passwordMismatch',
  confirmPassword: 'errors.passwordMismatch',
  username: 'errors.invalidUsername',
};

export function apiErrorMessage(err, t, fallbackKey = 'errors.somethingWentWrong') {
  if (!err) return t(fallbackKey);
  if (err.isNetworkError) return t('errors.networkError');
  if (err.status >= 500) return t('errors.serverError');
  if (err.code && CODE_KEYS[err.code]) return t(CODE_KEYS[err.code]);
  const fields = apiFieldErrors(err, t);
  const first = Object.values(fields)[0];
  if (first) return first;
  return err.message || t(fallbackKey);
}

// { field: translated message } for inline form errors
export function apiFieldErrors(err, t) {
  const details = err?.details || err?.response?.data?.error?.details;
  const out = {};
  if (Array.isArray(details)) {
    details.forEach((d) => {
      if (!d?.field || out[d.field]) return;
      out[d.field] = FIELD_KEYS[d.field] ? t(FIELD_KEYS[d.field]) : d.message;
    });
  }
  return out;
}
