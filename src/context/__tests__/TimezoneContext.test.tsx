import { describe, it, expect, beforeEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import {
  TimezoneProvider,
  useTimezone,
  getUtcOffset,
  TZ_OPTIONS,
} from '@/context/TimezoneContext';

function wrapper({ children }: { children: ReactNode }) {
  return <TimezoneProvider>{children}</TimezoneProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe('TimezoneContext', () => {
  it('defaults to browser timezone', () => {
    const { result } = renderHook(() => useTimezone(), { wrapper });
    expect(result.current.tzRaw).toBe('');
    // tzLabel should resolve to the browser's actual timezone label, not "Browser"
    expect(result.current.tzLabel).not.toBe('Browser');
    expect(result.current.tzLabel.length).toBeGreaterThan(0);
    expect(result.current.tz).toBeTruthy(); // should resolve to browser tz
  });

  it('allows setting a specific timezone', () => {
    const { result } = renderHook(() => useTimezone(), { wrapper });
    act(() => result.current.setTz('America/Denver'));
    expect(result.current.tz).toBe('America/Denver');
    expect(result.current.tzRaw).toBe('America/Denver');
  });

  it('persists timezone to localStorage', () => {
    const { result } = renderHook(() => useTimezone(), { wrapper });
    act(() => result.current.setTz('UTC'));
    expect(localStorage.getItem('freesnow_tz')).toBe('UTC');
  });

  it('reads persisted timezone on mount', () => {
    localStorage.setItem('freesnow_tz', 'America/New_York');
    const { result } = renderHook(() => useTimezone(), { wrapper });
    expect(result.current.tz).toBe('America/New_York');
    expect(result.current.tzLabel).toBe('Eastern (ET)');
  });

  it('fmtDate formats with selected timezone', () => {
    const { result } = renderHook(() => useTimezone(), { wrapper });
    act(() => result.current.setTz('UTC'));
    const formatted = result.current.fmtDate('2025-01-15T12:00:00Z', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
    expect(formatted).toContain('12');
  });

  it('resolves label for known timezone', () => {
    localStorage.setItem('freesnow_tz', 'America/Los_Angeles');
    const { result } = renderHook(() => useTimezone(), { wrapper });
    expect(result.current.tzLabel).toBe('Pacific (PT)');
  });
});

describe('getUtcOffset', () => {
  it('returns "+0" for UTC', () => {
    expect(getUtcOffset('UTC')).toBe('+0');
  });

  it('returns empty string for empty input', () => {
    expect(getUtcOffset('')).toBe('');
  });

  it('returns a string for a valid timezone', () => {
    const offset = getUtcOffset('America/New_York');
    // Should be something like "-5" or "-4" depending on DST
    expect(offset).toMatch(/^[+-]\d/);
  });
});

describe('TZ_OPTIONS', () => {
  it('contains at least 10 timezone options', () => {
    expect(TZ_OPTIONS.length).toBeGreaterThanOrEqual(10);
  });

  it('first option is browser default', () => {
    expect(TZ_OPTIONS[0]!.value).toBe('');
    expect(TZ_OPTIONS[0]!.label).toBe('Browser default');
  });

  it('includes UTC', () => {
    expect(TZ_OPTIONS.some((o) => o.value === 'UTC')).toBe(true);
  });
});
