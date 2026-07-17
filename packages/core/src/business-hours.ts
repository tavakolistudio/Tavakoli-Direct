/**
 * Business-hours calculation. Timezone-aware without external dependencies by
 * using Intl to read the local weekday and time in the client's IANA timezone.
 * Storage stays in UTC; this only interprets an instant against a schedule.
 */

/** "HH:MM" 24-hour local time. */
export type TimeOfDay = `${number}:${number}` | string;

export interface DayInterval {
  start: TimeOfDay;
  end: TimeOfDay;
}

/** 0 = Sunday … 6 = Saturday, matching JS getUTCDay / Intl weekday order. */
export interface WeeklyBusinessHours {
  timeZone: string;
  days: Partial<Record<number, DayInterval[]>>;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface LocalParts {
  weekday: number;
  minutes: number;
}

/** Read weekday + minutes-of-day for an instant in a given IANA timezone. */
export function localPartsInZone(at: Date, timeZone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = fmt.formatToParts(at);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = WEEKDAY_INDEX[get('weekday')] ?? 0;
  const hour = Number.parseInt(get('hour'), 10) || 0;
  const minute = Number.parseInt(get('minute'), 10) || 0;
  return { weekday, minutes: hour * 60 + minute };
}

function toMinutes(t: TimeOfDay): number {
  const [h, m] = String(t).split(':');
  return (Number.parseInt(h ?? '0', 10) || 0) * 60 + (Number.parseInt(m ?? '0', 10) || 0);
}

/** True when `at` falls inside the client's configured working hours. */
export function isWithinBusinessHours(
  schedule: WeeklyBusinessHours,
  at: Date = new Date(),
): boolean {
  const { weekday, minutes } = localPartsInZone(at, schedule.timeZone);
  const intervals = schedule.days[weekday];
  if (!intervals || intervals.length === 0) return false;
  return intervals.some((iv) => {
    const start = toMinutes(iv.start);
    const end = toMinutes(iv.end);
    // Overnight intervals (e.g. 22:00–02:00) wrap past midnight.
    if (end <= start) return minutes >= start || minutes < end;
    return minutes >= start && minutes < end;
  });
}

export function isOutsideBusinessHours(
  schedule: WeeklyBusinessHours,
  at: Date = new Date(),
): boolean {
  return !isWithinBusinessHours(schedule, at);
}

/** A sensible default: Sat–Wed 9–18, Thu 9–13, closed Friday (Iran work week). */
export function defaultBusinessHours(timeZone = 'Asia/Tehran'): WeeklyBusinessHours {
  const nineToSix: DayInterval[] = [{ start: '09:00', end: '18:00' }];
  return {
    timeZone,
    days: {
      6: nineToSix, // Saturday
      0: nineToSix, // Sunday
      1: nineToSix, // Monday
      2: nineToSix, // Tuesday
      3: nineToSix, // Wednesday
      4: [{ start: '09:00', end: '13:00' }], // Thursday
      // 5 (Friday) closed
    },
  };
}
