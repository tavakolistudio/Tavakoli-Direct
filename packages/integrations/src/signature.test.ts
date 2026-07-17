import { describe, expect, it } from 'vitest';
import { computeSignature, verifySignature } from './signature';

const secret = 'test-app-secret';
const body = JSON.stringify({ object: 'instagram', entry: [] });

describe('webhook signature', () => {
  it('verifies a correctly signed body', () => {
    const sig = computeSignature(body, secret);
    expect(verifySignature(body, sig, secret)).toBe(true);
  });

  it('rejects a missing signature', () => {
    expect(verifySignature(body, null, secret)).toBe(false);
  });

  it('rejects a tampered body', () => {
    const sig = computeSignature(body, secret);
    expect(verifySignature(body + ' ', sig, secret)).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const sig = computeSignature(body, 'other-secret');
    expect(verifySignature(body, sig, secret)).toBe(false);
  });
});
