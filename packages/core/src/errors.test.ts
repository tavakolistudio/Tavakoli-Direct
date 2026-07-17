import { describe, expect, it } from 'vitest';
import { AppError, mapProviderError, PERSIAN_ERROR_MESSAGES, toAppError } from './errors';

describe('mapProviderError', () => {
  it('maps OAuth/token errors to PROVIDER_AUTH (reconnect)', () => {
    expect(mapProviderError({ code: 190 }).category).toBe('PROVIDER_AUTH');
    expect(mapProviderError({ type: 'OAuthException' }).category).toBe('PROVIDER_AUTH');
  });

  it('maps rate-limit codes and HTTP 429 to PROVIDER_RATE_LIMIT (retryable)', () => {
    const e = mapProviderError({ code: 4 });
    expect(e.category).toBe('PROVIDER_RATE_LIMIT');
    expect(e.retryable).toBe(true);
    expect(mapProviderError({ httpStatus: 429 }).category).toBe('PROVIDER_RATE_LIMIT');
  });

  it('maps 5xx to a retryable temporary error', () => {
    const e = mapProviderError({ httpStatus: 503 });
    expect(e.category).toBe('PROVIDER_TEMPORARY');
    expect(e.retryable).toBe(true);
  });

  it('maps unknown codes to a permanent (non-retryable) error', () => {
    const e = mapProviderError({ code: 999999 });
    expect(e.category).toBe('PROVIDER_PERMANENT');
    expect(e.retryable).toBe(false);
  });
});

describe('AppError', () => {
  it('exposes a safe Persian message and never the raw cause', () => {
    const e = new AppError('AUTHORIZATION');
    expect(e.persianMessage).toBe(PERSIAN_ERROR_MESSAGES.AUTHORIZATION);
    expect(e.toSafeJSON()).toEqual({
      category: 'AUTHORIZATION',
      message: PERSIAN_ERROR_MESSAGES.AUTHORIZATION,
      retryable: false,
    });
  });

  it('wraps unknown throwables', () => {
    expect(toAppError('boom').category).toBe('UNKNOWN');
    expect(toAppError(new Error('x')).category).toBe('UNKNOWN');
  });
});
