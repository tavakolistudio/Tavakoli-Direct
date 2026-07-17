import { beforeAll, describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from './crypto';

beforeAll(() => {
  // 32-byte key (base64) — test only.
  process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
});

describe('token encryption at rest (AES-256-GCM)', () => {
  it('round-trips a secret', () => {
    const token = 'IGQVJ-super-secret-token-value';
    const enc = encryptSecret(token);
    expect(enc.ciphertext).not.toContain(token);
    expect(decryptSecret(enc)).toBe(token);
  });

  it('produces a distinct IV each time (non-deterministic ciphertext)', () => {
    const a = encryptSecret('same');
    const b = encryptSecret('same');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('fails to decrypt when the auth tag is tampered', () => {
    const enc = encryptSecret('secret');
    const tampered = { ...enc, authTag: Buffer.alloc(16, 0).toString('base64') };
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
