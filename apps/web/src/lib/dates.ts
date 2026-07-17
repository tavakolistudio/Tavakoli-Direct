/**
 * Persian-friendly date formatting. Storage stays UTC; these helpers only format
 * for display using the fa-IR (Persian/Jalali) calendar.
 */
const dateFmt = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const dateTimeFmt = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateFa(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return dateFmt.format(new Date(value));
}

export function formatDateTimeFa(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return dateTimeFmt.format(new Date(value));
}

/** Relative "x minutes ago" style label in Persian. */
export function formatRelativeFa(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const then = new Date(value).getTime();
  const diffMs = Date.now() - then;
  const rtf = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' });
  const mins = Math.round(diffMs / 60000);
  if (Math.abs(mins) < 60) return rtf.format(-mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  return rtf.format(-days, 'day');
}

/** Convert a Latin-digit string to Persian digits for display. */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
}
