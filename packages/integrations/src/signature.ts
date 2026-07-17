/**
 * Meta webhook signature verification (X-Hub-Signature-256). Meta signs the raw
 * request body with HMAC-SHA256 using the app secret. We compare in constant time.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export function computeSignature(rawBody: string, appSecret: string): string {
  const digest = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  return `sha256=${digest}`;
}

export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = computeSignature(rawBody, appSecret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
