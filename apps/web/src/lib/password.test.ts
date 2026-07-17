import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing (Argon2id)', () => {
  it('verifies a correct password', async () => {
    const digest = await hashPassword('Admin!12345');
    expect(digest).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(digest, 'Admin!12345')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const digest = await hashPassword('Admin!12345');
    expect(await verifyPassword(digest, 'wrong')).toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    expect(await verifyPassword('not-a-hash', 'x')).toBe(false);
  });
});
