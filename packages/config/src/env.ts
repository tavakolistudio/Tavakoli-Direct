/**
 * Centralized, validated environment access. Import `env` from here instead of
 * reading `process.env` directly. Validation runs lazily on first access so that
 * tooling (e.g. `tsc`) does not require a populated environment.
 *
 * Meta credentials are only required when INSTAGRAM_PROVIDER=meta. Mock mode
 * needs no Meta values — this keeps the whole product runnable without credentials.
 */
import { z } from 'zod';

const boolish = z
  .string()
  .transform((v) => v === '1' || v.toLowerCase() === 'true')
  .pipe(z.boolean());

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().url(),
  // Defaulted so the web panel can boot before Redis is provisioned. The rate
  // limiter fails open when Redis is unreachable; the worker/queue still need a
  // real REDIS_URL to process webhooks and outbound messages.
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  APP_ENCRYPTION_KEY: z
    .string()
    .min(1, 'APP_ENCRYPTION_KEY is required')
    .refine(
      (v) => decodeKeyLength(v) === 32,
      'APP_ENCRYPTION_KEY must decode to 32 bytes (base64)',
    ),

  APP_URL: z.string().url().default('http://localhost:3000'),
  WORKER_URL: z.string().url().default('http://localhost:3001'),

  INSTAGRAM_PROVIDER: z.enum(['mock', 'meta']).default('mock'),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),
  META_GRAPH_API_VERSION: z.string().default('v21.0'),
  META_REDIRECT_URI: z.string().url().optional(),

  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),

  WEBHOOK_PAYLOAD_RETENTION_DAYS: z.coerce.number().int().positive().default(30),

  DEV_MOCK_TOOLS: boolish.optional(),
});

/** When provider=meta, these become mandatory. */
const metaRequiredSchema = baseSchema.superRefine((val, ctx) => {
  if (val.INSTAGRAM_PROVIDER === 'meta') {
    for (const key of ['META_APP_ID', 'META_APP_SECRET', 'META_VERIFY_TOKEN'] as const) {
      if (!val[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when INSTAGRAM_PROVIDER=meta`,
        });
      }
    }
  }
  if (val.STORAGE_PROVIDER === 's3' && !val.STORAGE_BUCKET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['STORAGE_BUCKET'],
      message: 'STORAGE_BUCKET is required when STORAGE_PROVIDER=s3',
    });
  }
});

function decodeKeyLength(v: string): number {
  try {
    return Buffer.from(v, 'base64').length;
  } catch {
    return -1;
  }
}

export type Env = z.infer<typeof baseSchema>;

let cached: Env | null = null;

/** Parse and validate the environment. Throws a readable error on misconfiguration. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = metaRequiredSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

/** Lazily-validated, cached environment. */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    if (!cached) cached = loadEnv();
    return cached[prop as keyof Env];
  },
});

/** Force (re)validation — useful at process startup to fail fast. */
export function assertEnv(): Env {
  cached = loadEnv();
  return cached;
}

export const isProduction = (): boolean => env.NODE_ENV === 'production';
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';
export const isTest = (): boolean => env.NODE_ENV === 'test';
