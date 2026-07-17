/**
 * Minimal structured logger with secret redaction. Never logs tokens.
 */
const SECRET_KEYS = /(token|secret|password|authorization|accessToken)/i;

function redact(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SECRET_KEYS.test(k) ? '[redacted]' : v;
  }
  return out;
}

function emit(level: string, msg: string, meta?: Record<string, unknown>): void {
  const line = { level, msg, time: new Date().toISOString(), ...redact(meta) };
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : 'info'](JSON.stringify(line));
}

export const log = {
  info: (msg: string, meta?: Record<string, unknown>): void => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>): void => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>): void => emit('error', msg, meta),
};
