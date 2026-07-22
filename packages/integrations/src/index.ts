import { env } from '@tavakoli/config';
import { MetaInstagramProvider } from './meta';
import { MockInstagramProvider } from './mock';
import type { InstagramMessagingProvider } from './types';

export * from './types';
export * from './ai';
export * from './signature';
export { MockInstagramProvider } from './mock';
export { MetaInstagramProvider } from './meta';

let cached: InstagramMessagingProvider | null = null;

/** Return the configured provider (mock | meta). Cached per process. */
export function getProvider(): InstagramMessagingProvider {
  if (cached) return cached;
  cached =
    env.INSTAGRAM_PROVIDER === 'meta' ? new MetaInstagramProvider() : new MockInstagramProvider();
  return cached;
}

/** For tests: reset the cached provider. */
export function resetProvider(): void {
  cached = null;
}
