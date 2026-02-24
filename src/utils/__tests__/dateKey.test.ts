import { describe, it, expect } from 'bun:test';
import { isoDateInTimezone, todayIsoInTimezone } from '@/utils/dateKey';

describe('dateKey helpers', () => {
  it('formats a stable YYYY-MM-DD key in a timezone', () => {
    const date = new Date('2025-01-20T01:30:00Z');
    expect(isoDateInTimezone(date, 'UTC')).toBe('2025-01-20');
    expect(isoDateInTimezone(date, 'America/Los_Angeles')).toBe('2025-01-19');
  });

  it('todayIsoInTimezone returns YYYY-MM-DD', () => {
    const today = todayIsoInTimezone('UTC');
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
