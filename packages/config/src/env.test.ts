import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  AUTH_SECRET: 'x'.repeat(32),
  APP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
};

describe('loadEnv', () => {
  it('accepts a valid mock-mode environment without Meta credentials', () => {
    const env = loadEnv({ ...base, INSTAGRAM_PROVIDER: 'mock' } as NodeJS.ProcessEnv);
    expect(env.INSTAGRAM_PROVIDER).toBe('mock');
    expect(env.META_GRAPH_API_VERSION).toBe('v21.0');
  });

  it('requires Meta credentials when provider is meta', () => {
    expect(() =>
      loadEnv({ ...base, INSTAGRAM_PROVIDER: 'meta' } as NodeJS.ProcessEnv),
    ).toThrowError(/INSTAGRAM_APP_ID/);
  });

  it('accepts INSTAGRAM_APP_* credentials alone in meta mode', () => {
    const env = loadEnv({
      ...base,
      INSTAGRAM_PROVIDER: 'meta',
      INSTAGRAM_APP_ID: '123',
      INSTAGRAM_APP_SECRET: 'secret',
      META_VERIFY_TOKEN: 'verify',
    } as NodeJS.ProcessEnv);
    expect(env.INSTAGRAM_PROVIDER).toBe('meta');
  });

  it('rejects an encryption key that is not 32 bytes', () => {
    expect(() =>
      loadEnv({ ...base, APP_ENCRYPTION_KEY: 'short' } as NodeJS.ProcessEnv),
    ).toThrowError(/APP_ENCRYPTION_KEY/);
  });

  it('rejects a short AUTH_SECRET', () => {
    expect(() => loadEnv({ ...base, AUTH_SECRET: 'tooshort' } as NodeJS.ProcessEnv)).toThrowError(
      /AUTH_SECRET/,
    );
  });
});
