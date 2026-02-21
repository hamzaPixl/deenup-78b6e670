// backend/src/__tests__/validators/auth.test.ts
import { validateSignup, validateLogin, validatePasswordReset, validatePasswordResetConfirm } from '../../validators/auth';

describe('Auth Validators', () => {
  describe('validateSignup', () => {
    it('should pass with valid input', () => {
      const result = validateSignup({
        email: 'user@example.com',
        password: 'password123',
        displayName: 'Test User',
      });
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with invalid email', () => {
      const result = validateSignup({
        email: 'not-an-email',
        password: 'password123',
        displayName: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });

    it('should fail with missing email', () => {
      const result = validateSignup({
        email: '',
        password: 'password123',
        displayName: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });

    it('should fail with short password', () => {
      const result = validateSignup({
        email: 'user@example.com',
        password: 'short',
        displayName: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'password' })
      );
    });

    it('should fail with missing displayName', () => {
      const result = validateSignup({
        email: 'user@example.com',
        password: 'password123',
        displayName: '',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'displayName' })
      );
    });

    it('should fail with whitespace-only displayName', () => {
      const result = validateSignup({
        email: 'user@example.com',
        password: 'password123',
        displayName: '   ',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateLogin', () => {
    it('should pass with valid input', () => {
      const result = validateLogin({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should fail with missing email', () => {
      const result = validateLogin({ email: '', password: 'password123' });
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });

    it('should fail with missing password', () => {
      const result = validateLogin({ email: 'user@example.com', password: '' });
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'password' })
      );
    });

    it('should fail with missing fields', () => {
      const result = validateLogin({ email: '', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('validatePasswordReset', () => {
    it('should pass with valid email', () => {
      const result = validatePasswordReset({ email: 'user@example.com' });
      expect(result.success).toBe(true);
    });

    it('should fail with invalid email', () => {
      const result = validatePasswordReset({ email: 'not-an-email' });
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });
  });

  describe('validatePasswordResetConfirm', () => {
    it('should pass with valid input', () => {
      const result = validatePasswordResetConfirm({
        token: 'valid-token',
        newPassword: 'newpassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should fail with short new password', () => {
      const result = validatePasswordResetConfirm({
        token: 'valid-token',
        newPassword: 'short',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'newPassword' })
      );
    });

    it('should fail with missing token', () => {
      const result = validatePasswordResetConfirm({
        token: '',
        newPassword: 'newpassword123',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'token' })
      );
    });
  });
});
