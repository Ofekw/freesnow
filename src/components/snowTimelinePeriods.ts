import type { HourlyMetrics } from '@/types';

export interface PeriodSnow {
  am: number;
  pm: number;
  overnight: number;
}

/**
 * Sum hourly snowfall for a given date into AM / PM / Overnight buckets.
 * AM = target-day hours 6-11, PM = target-day hours 12-17,
 * Overnight = target-day hours 18-23 + next-day hours 0-5.
 */
export function splitDayPeriods(date: string, hourly: HourlyMetrics[]): PeriodSnow {
  const nextDate = new Date(`${date}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextDateStr = nextDate.toISOString().slice(0, 10);

  let am = 0;
  let pm = 0;
  let overnight = 0;

  for (const h of hourly) {
    const hourDate = h.time.slice(0, 10);
    const hour = Number(h.time.slice(11, 13));
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;

    if (hourDate === date) {
      if (hour >= 6 && hour < 12) am += h.snowfall;
      else if (hour >= 12 && hour < 18) pm += h.snowfall;
      else if (hour >= 18) overnight += h.snowfall;
    } else if (hourDate === nextDateStr && hour < 6) {
      overnight += h.snowfall;
    }
  }

  return { am, pm, overnight };
}
