// backend/src/validators/auth.ts
import { AUTH_DEFAULTS } from '@deenup/shared';

interface ValidationResult {
  success: boolean;
  errors: Array<{ field: string; message: string }>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup(input: {
  email: string;
  password: string;
  displayName: string;
}): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    errors.push({ field: 'email', message: 'Adresse e-mail invalide' });
  }
  if (!input.password || input.password.length < AUTH_DEFAULTS.MIN_PASSWORD_LENGTH) {
    errors.push({
      field: 'password',
      message: `Le mot de passe doit contenir au moins ${AUTH_DEFAULTS.MIN_PASSWORD_LENGTH} caractères`,
    });
  }
  if (!input.displayName || input.displayName.trim().length === 0) {
    errors.push({ field: 'displayName', message: 'Le nom est requis' });
  }

  return { success: errors.length === 0, errors };
}

export function validateLogin(input: {
  email: string;
  password: string;
}): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    errors.push({ field: 'email', message: 'Adresse e-mail invalide' });
  }
  if (!input.password) {
    errors.push({ field: 'password', message: 'Le mot de passe est requis' });
  }
  return { success: errors.length === 0, errors };
}

export function validatePasswordReset(input: { email: string }): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    errors.push({ field: 'email', message: 'Adresse e-mail invalide' });
  }
  return { success: errors.length === 0, errors };
}

export function validatePasswordResetConfirm(input: {
  token: string;
  newPassword: string;
}): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  if (!input.token) {
    errors.push({ field: 'token', message: 'Token requis' });
  }
  if (!input.newPassword || input.newPassword.length < AUTH_DEFAULTS.MIN_PASSWORD_LENGTH) {
    errors.push({
      field: 'newPassword',
      message: `Le mot de passe doit contenir au moins ${AUTH_DEFAULTS.MIN_PASSWORD_LENGTH} caractères`,
    });
  }
  return { success: errors.length === 0, errors };
}
