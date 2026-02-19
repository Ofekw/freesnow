import { describe, it, expect } from 'bun:test';
import {
  weatherDescription,
  fmtTemp,
  fmtElevation,
  cmToIn,
  fmtSnow,
} from '@/utils/weather';

/* ── weatherDescription ─────────────────────────── */

describe('weatherDescription', () => {
  it('returns label and icon for known WMO code', () => {
    const result = weatherDescription(0);
    expect(result).toEqual({ label: 'Clear sky', icon: 'sun' });
  });

  it('returns Heavy snow for code 75', () => {
    expect(weatherDescription(75)).toEqual({ label: 'Heavy snow', icon: 'snowflake' });
  });

  it('returns Thunderstorm for code 95', () => {
    expect(weatherDescription(95)).toEqual({ label: 'Thunderstorm', icon: 'cloud-lightning' });
  });

  it('returns fallback for unknown WMO code', () => {
    const result = weatherDescription(999);
    expect(result.label).toBe('Code 999');
    expect(result.icon).toBe('help');
  });

  it('returns Fog for code 45', () => {
    expect(weatherDescription(45)).toEqual({ label: 'Fog', icon: 'cloud-fog' });
  });

  it('returns Snow for code 73', () => {
    expect(weatherDescription(73)).toEqual({ label: 'Snow', icon: 'cloud-snow' });
  });
});

/* ── fmtTemp ────────────────────────────────────── */

describe('fmtTemp', () => {
  it('converts 0°C to 32°F', () => {
    expect(fmtTemp(0, 'F')).toBe('32°F');
  });

  it('converts 100°C to 212°F', () => {
    expect(fmtTemp(100, 'F')).toBe('212°F');
  });

  it('converts -40°C to -40°F', () => {
    expect(fmtTemp(-40, 'F')).toBe('-40°F');
  });

  it('displays raw Celsius when unit is C', () => {
    expect(fmtTemp(25, 'C')).toBe('25°C');
  });

  it('rounds Celsius values', () => {
    expect(fmtTemp(25.7, 'C')).toBe('26°C');
  });

  it('rounds Fahrenheit results', () => {
    expect(fmtTemp(37, 'F')).toBe('99°F');
  });

  it('defaults to Fahrenheit', () => {
    expect(fmtTemp(0)).toBe('32°F');
  });
});

/* ── fmtElevation ───────────────────────────────── */

describe('fmtElevation', () => {
  it('converts meters to feet', () => {
    // 1000m ≈ 3281ft
    expect(fmtElevation(1000, 'ft')).toBe('3,281ft');
  });

  it('formats meters with locale string', () => {
    expect(fmtElevation(3000, 'm')).toBe('3,000m');
  });

  it('defaults to feet', () => {
    expect(fmtElevation(1000)).toBe('3,281ft');
  });

  it('handles zero elevation', () => {
    expect(fmtElevation(0, 'ft')).toBe('0ft');
    expect(fmtElevation(0, 'm')).toBe('0m');
  });

  it('rounds fractional meters', () => {
    expect(fmtElevation(1000.7, 'm')).toBe('1,001m');
  });
});

/* ── cmToIn ─────────────────────────────────────── */

describe('cmToIn', () => {
  it('converts cm to inches correctly', () => {
    expect(cmToIn(2.54)).toBeCloseTo(1.0);
  });

  it('handles zero', () => {
    expect(cmToIn(0)).toBe(0);
  });

  it('converts 10cm', () => {
    expect(cmToIn(10)).toBeCloseTo(3.937, 2);
  });
});

/* ── fmtSnow ────────────────────────────────────── */

describe('fmtSnow', () => {
  it('formats snowfall in inches', () => {
    const result = fmtSnow(2.54, 'in');
    expect(result).toBe('1.0"');
  });

  it('formats snowfall in centimeters', () => {
    expect(fmtSnow(5, 'cm')).toBe('5.0cm');
  });

  it('defaults to inches', () => {
    expect(fmtSnow(2.54)).toBe('1.0"');
  });

  it('handles zero snowfall', () => {
    expect(fmtSnow(0, 'in')).toBe('0.0"');
    expect(fmtSnow(0, 'cm')).toBe('0.0cm');
  });

  it('formats large snowfall values', () => {
    const result = fmtSnow(100, 'in');
    expect(result).toBe('39.4"');
  });
});
