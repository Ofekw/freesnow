import { describe, it, expect } from 'bun:test';
import {
  snowLiquidRatio,
  recalcHourly,
  recalcDailyFromHourly,
} from '@/utils/snowRecalc';

/* ── snowLiquidRatio ───────────────────────────── */

describe('snowLiquidRatio', () => {
  it('returns 0 above 2°C (rain)', () => {
    expect(snowLiquidRatio(5)).toBe(0);
    expect(snowLiquidRatio(3)).toBe(0);
  });

  it('returns 0.5 for 0–2°C (wet mix)', () => {
    expect(snowLiquidRatio(1)).toBe(0.5);
    expect(snowLiquidRatio(0.5)).toBe(0.5);
  });

  it('returns 1.0 for -2 to 0°C (heavy wet snow)', () => {
    expect(snowLiquidRatio(0)).toBe(1.0);
    expect(snowLiquidRatio(-1)).toBe(1.0);
  });

  it('returns 1.2 for -5 to -2°C (moderate snow)', () => {
    expect(snowLiquidRatio(-3)).toBe(1.2);
    expect(snowLiquidRatio(-4.9)).toBe(1.2);
  });

  it('returns 1.5 for -10 to -5°C (mountain snow)', () => {
    expect(snowLiquidRatio(-5)).toBe(1.5);
    expect(snowLiquidRatio(-7)).toBe(1.5);
  });

  it('returns 1.8 for -15 to -10°C (cold snow)', () => {
    expect(snowLiquidRatio(-10)).toBe(1.8);
    expect(snowLiquidRatio(-12)).toBe(1.8);
  });

  it('returns 2.0 below -15°C (powder)', () => {
    expect(snowLiquidRatio(-15)).toBe(2.0);
    expect(snowLiquidRatio(-20)).toBe(2.0);
  });
});

/* ── recalcHourly ──────────────────────────────── */

describe('recalcHourly', () => {
  it('returns zero snow and rain when no precip', () => {
    const result = recalcHourly(
      { precipitation: 0, rain: 0, snowfall: 0, temperature: -5, freezingLevelHeight: 500 },
      1800,
    );
    expect(result).toEqual({ snowfall: 0, rain: 0 });
  });

  it('converts all precip to snow when station is above freezing level', () => {
    // Station at 1800m, freezing level at 500m, temp -7°C → SLR 1.5
    const result = recalcHourly(
      { precipitation: 1.0, rain: 0.5, snowfall: 0.14, temperature: -7, freezingLevelHeight: 500 },
      1800,
    );
    expect(result.snowfall).toBe(1.5);  // 1.0mm * 1.5 SLR
    expect(result.rain).toBe(0);
  });

  it('eliminates rain at sub-freezing temperatures near freezing level', () => {
    // Station at 600m, freezing level at 620m, temp -1°C → SLR 1.0
    const result = recalcHourly(
      { precipitation: 0.7, rain: 0.2, snowfall: 0.35, temperature: -1, freezingLevelHeight: 620 },
      600,
    );
    expect(result.snowfall).toBe(0.7);  // 0.7mm * 1.0 SLR
    expect(result.rain).toBe(0);
  });

  it('outputs all rain above 2°C', () => {
    const result = recalcHourly(
      { precipitation: 2.0, rain: 2.0, snowfall: 0, temperature: 5, freezingLevelHeight: 3000 },
      500,
    );
    expect(result.snowfall).toBe(0);
    expect(result.rain).toBe(2.0);
  });

  it('splits precip in marginal zone (0–2°C)', () => {
    // Temp 1°C → snowFraction = (2-1)/2 = 0.5, SLR = 0.5
    const result = recalcHourly(
      { precipitation: 2.0, rain: 1.0, snowfall: 0.5, temperature: 1, freezingLevelHeight: 1900 },
      1800,
    );
    // snow: 2.0 * 0.5 * 0.5 = 0.5cm, rain: 2.0 * 0.5 = 1.0mm
    expect(result.snowfall).toBe(0.5);
    expect(result.rain).toBe(1.0);
  });

  it('produces more snow at colder temperatures for same precip', () => {
    const base = { precipitation: 1.0, rain: 0, snowfall: 0.14, freezingLevelHeight: 200 };

    const warm = recalcHourly({ ...base, temperature: -3 }, 1800);   // SLR 1.2
    const cold = recalcHourly({ ...base, temperature: -12 }, 1800);  // SLR 1.8

    expect(cold.snowfall).toBeGreaterThan(warm.snowfall);
    expect(warm.snowfall).toBe(1.2);
    expect(cold.snowfall).toBe(1.8);
  });

  it('preserves precip as snow when station is above freezing level even with warm temps', () => {
    // Station at 2000m, freezing level at 500m (well below), but warm temp of 3°C
    // Without clamping, SLR would be 0 and precip would be lost
    const result = recalcHourly(
      { precipitation: 1.0, rain: 0, snowfall: 0, temperature: 3, freezingLevelHeight: 500 },
      2000,
    );
    // Should still produce snow (with clamped temp of 0°C → SLR 1.0)
    expect(result.snowfall).toBe(1.0);
    expect(result.rain).toBe(0);
  });

  it('handles edge case of freezing level below station with positive temp', () => {
    // Station at 1500m, freezing level at 1000m, temp 1°C
    // Station is 500m above freezing level → should be all snow with clamped temp
    const result = recalcHourly(
      { precipitation: 2.0, rain: 0, snowfall: 0, temperature: 1, freezingLevelHeight: 1000 },
      1500,
    );
    // Clamped to 0°C → SLR 1.0
    expect(result.snowfall).toBe(2.0);
    expect(result.rain).toBe(0);
  });

  it('Crystal Mountain mid example: ~3.9cm instead of 1.4cm', () => {
    // Simulates Feb 18 hourly data for Crystal Mountain mid (1800m)
    // Key hours with precip: temps around -7 to -13°C, freezing level 0-680m
    const hours = [
      { precipitation: 0.40, temperature: -10.5, freezingLevelHeight: 340 },
      { precipitation: 0.20, temperature: -9.5, freezingLevelHeight: 160 },
      { precipitation: 0.70, temperature: -7.6, freezingLevelHeight: 620 },
      { precipitation: 0.40, temperature: -7.3, freezingLevelHeight: 680 },
      { precipitation: 0.40, temperature: -7.6, freezingLevelHeight: 620 },
      { precipitation: 0.40, temperature: -11.7, freezingLevelHeight: 0 },
    ];

    let totalSnow = 0;
    for (const h of hours) {
      const result = recalcHourly(
        { ...h, rain: 0, snowfall: 0 },
        1800,
      );
      totalSnow += result.snowfall;
    }

    // Should be significantly more than the API's 1.4cm
    expect(totalSnow).toBeGreaterThan(3);
    // Should be in a reasonable range for ~2.5mm total precip at cold temps
    expect(totalSnow).toBeLessThan(6);
  });
});

/* ── recalcDailyFromHourly ─────────────────────── */

describe('recalcDailyFromHourly', () => {
  it('sums hourly values correctly', () => {
    const result = recalcDailyFromHourly(
      [0.5, 1.0, 0.3, 0.2],
      [0.1, 0, 0, 0.05],
    );
    expect(result.snowfallSum).toBe(2.0);
    expect(result.rainSum).toBe(0.15);
  });

  it('returns zero for empty arrays', () => {
    const result = recalcDailyFromHourly([], []);
    expect(result.snowfallSum).toBe(0);
    expect(result.rainSum).toBe(0);
  });
});
