/**
 * Consistent error architecture. Every error has a category, a safe Persian
 * message for end users, and never leaks stack traces or secrets to the UI.
 */

export const ERROR_CATEGORIES = [
  'VALIDATION',
  'AUTHENTICATION',
  'AUTHORIZATION',
  'PROVIDER_AUTH',
  'PROVIDER_PERMISSION',
  'PROVIDER_RATE_LIMIT',
  'PROVIDER_TEMPORARY',
  'PROVIDER_PERMANENT',
  'DUPLICATE_EVENT',
  'DATABASE',
  'QUEUE',
  'UNKNOWN',
] as const;
export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

/** Safe, user-facing Persian messages per category. */
export const PERSIAN_ERROR_MESSAGES: Record<ErrorCategory, string> = {
  VALIDATION: 'اطلاعات واردشده معتبر نیست.',
  AUTHENTICATION: 'ایمیل یا رمز عبور نادرست است.',
  AUTHORIZATION: 'مجوز لازم برای این عملیات در دسترس نیست.',
  PROVIDER_AUTH: 'اتصال پیج نیاز به تمدید دارد. برای ادامه، اتصال Meta را دوباره برقرار کنید.',
  PROVIDER_PERMISSION: 'مجوز لازم برای این عملیات در دسترس نیست.',
  PROVIDER_RATE_LIMIT: 'به دلیل محدودیت موقت، لطفاً کمی بعد دوباره تلاش کنید.',
  PROVIDER_TEMPORARY: 'ارسال پیام به‌طور موقت ناموفق بود. سیستم دوباره تلاش می‌کند.',
  PROVIDER_PERMANENT: 'ارسال این پیام ممکن نیست.',
  DUPLICATE_EVENT: 'این رویداد قبلاً پردازش شده است.',
  DATABASE: 'خطای داخلی رخ داد. لطفاً بعداً دوباره تلاش کنید.',
  QUEUE: 'پردازش این درخواست با تأخیر انجام می‌شود.',
  UNKNOWN: 'خطای نامشخصی رخ داد.',
};

/** Whether an error of this category should be retried by the queue. */
export function isRetryable(category: ErrorCategory): boolean {
  return (
    category === 'PROVIDER_RATE_LIMIT' || category === 'PROVIDER_TEMPORARY' || category === 'QUEUE'
  );
}

export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly retryable: boolean;
  /** Non-secret structured context for logs. */
  readonly context?: Record<string, unknown>;

  constructor(
    category: ErrorCategory,
    message?: string,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super(message ?? category);
    this.name = 'AppError';
    this.category = category;
    this.retryable = isRetryable(category);
    this.context = options?.context;
    if (options?.cause !== undefined) this.cause = options.cause;
  }

  /** The safe Persian message for this error's category. */
  get persianMessage(): string {
    return PERSIAN_ERROR_MESSAGES[this.category];
  }

  toSafeJSON(): { category: ErrorCategory; message: string; retryable: boolean } {
    return { category: this.category, message: this.persianMessage, retryable: this.retryable };
  }
}

/**
 * Map a provider (Meta) error into a structured category. Meta error codes are
 * documented; unknown codes fall back to a permanent provider error so they are
 * surfaced rather than silently retried forever.
 */
export interface ProviderErrorShape {
  code?: number;
  subcode?: number;
  type?: string;
  message?: string;
  httpStatus?: number;
}

export function mapProviderError(err: ProviderErrorShape): AppError {
  const { code, httpStatus } = err;

  // Auth/token issues → reconnect required.
  if (code === 190 || err.type === 'OAuthException') {
    return new AppError('PROVIDER_AUTH', err.message, { context: { code, subcode: err.subcode } });
  }
  // Permission problems.
  if (code === 10 || code === 200 || code === 803) {
    return new AppError('PROVIDER_PERMISSION', err.message, { context: { code } });
  }
  // Rate limiting.
  if (code === 4 || code === 17 || code === 32 || code === 613 || httpStatus === 429) {
    return new AppError('PROVIDER_RATE_LIMIT', err.message, { context: { code } });
  }
  // Transient server errors.
  if (code === 1 || code === 2 || (httpStatus && httpStatus >= 500)) {
    return new AppError('PROVIDER_TEMPORARY', err.message, { context: { code, httpStatus } });
  }
  // Everything else is treated as a permanent provider failure.
  return new AppError('PROVIDER_PERMANENT', err.message, { context: { code, httpStatus } });
}

/** Normalize any thrown value into an AppError without leaking internals. */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) return new AppError('UNKNOWN', err.message, { cause: err });
  return new AppError('UNKNOWN', 'Unknown error', { cause: err });
}
