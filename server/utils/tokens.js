import crypto from 'crypto';

/**
 * Generates a cryptographically secure, URL-safe random token
 * (used for password-reset links, etc).
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
