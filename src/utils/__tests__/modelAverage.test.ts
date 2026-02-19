import { describe, it, expect } from 'bun:test';
import {
  mean,
  median,
  averageHourlyArrays,
  averageDailyArrays,
  blendWithNWS,
  modelsForCountry,
} from '@/utils/modelAverage';
import type { RawHourly, RawDaily } from '@/utils/modelAverage';

/* ── mean / median helpers ─────────────────────── */

describe('mean', () => {
  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('computes mean of values', () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it('handles single value', () => {
    expect(mean([7])).toBe(7);
  });
});

describe('median', () => {
  it('returns 0 for empty array', () => {
    expect(median([])).toBe(0);
  });

  it('returns middle value for odd-length array', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('returns average of two middle values for even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('handles single value', () => {
    expect(median([5])).toBe(5);
  });

  it('is robust to outliers (vs mean)', () => {
    // Median is 2, mean would be 12
    expect(median([1, 2, 3, 50])).toBe(2.5);
    expect(mean([1, 2, 3, 50])).toBe(14);
  });
});

/* ── averageHourlyArrays ──────────────────────── */

function makeHourly(overrides: Partial<RawHourly> & { time: string[] }): RawHourly {
  const len = overrides.time.length;
  const zeros = () => new Array(len).fill(0);
  return {
    time: overrides.time,
    temperature_2m: overrides.temperature_2m ?? zeros(),
    apparent_temperature: overrides.apparent_temperature ?? zeros(),
    relative_humidity_2m: overrides.relative_humidity_2m ?? zeros(),
    precipitation: overrides.precipitation ?? zeros(),
    rain: overrides.rain ?? zeros(),
    snowfall: overrides.snowfall ?? zeros(),
    precipitation_probability: overrides.precipitation_probability ?? zeros(),
    weather_code: overrides.weather_code ?? zeros(),
    wind_speed_10m: overrides.wind_speed_10m ?? zeros(),
    wind_direction_10m: overrides.wind_direction_10m ?? zeros(),
    wind_gusts_10m: overrides.wind_gusts_10m ?? zeros(),
    freezing_level_height: overrides.freezing_level_height ?? zeros(),
  };
}

describe('averageHourlyArrays', () => {
  it('throws for empty array', () => {
    expect(() => averageHourlyArrays([])).toThrow();
  });

  it('returns single model unchanged', () => {
    const m = makeHourly({
      time: ['2026-02-18T00:00', '2026-02-18T01:00'],
      temperature_2m: [-5, -7],
      precipitation: [0.5, 1.0],
    });
    const result = averageHourlyArrays([m]);
    expect(result).toBe(m); // same reference
  });

  it('averages temperature (mean) across two models', () => {
    const m1 = makeHourly({
      time: ['2026-02-18T00:00'],
      temperature_2m: [-4],
    });
    const m2 = makeHourly({
      time: ['2026-02-18T00:00'],
      temperature_2m: [-8],
    });
    const result = averageHourlyArrays([m1, m2]);
    expect(result.temperature_2m[0]).toBe(-6); // mean of -4 and -8
  });

  it('uses median for precipitation', () => {
    const m1 = makeHourly({
      time: ['2026-02-18T00:00'],
      precipitation: [0.5],
    });
    const m2 = makeHourly({
      time: ['2026-02-18T00:00'],
      precipitation: [1.0],
    });
    const m3 = makeHourly({
      time: ['2026-02-18T00:00'],
      precipitation: [10.0], // outlier
    });
    const result = averageHourlyArrays([m1, m2, m3]);
    expect(result.precipitation[0]).toBe(1.0); // median
  });

  it('handles different time ranges (union)', () => {
    const m1 = makeHourly({
      time: ['T00', 'T01', 'T02'],
      temperature_2m: [-3, -4, -5],
    });
    const m2 = makeHourly({
      time: ['T00', 'T01'], // shorter range (like HRRR)
      temperature_2m: [-5, -6],
    });
    const result = averageHourlyArrays([m1, m2]);
    expect(result.time).toEqual(['T00', 'T01', 'T02']);
    expect(result.temperature_2m[0]).toBe(-4);   // mean(-3, -5)
    expect(result.temperature_2m[1]).toBe(-5);   // mean(-4, -6)
    expect(result.temperature_2m[2]).toBe(-5);   // only m1 has T02
  });

  it('averages wind direction across the 360° boundary', () => {
    const m1 = makeHourly({
      time: ['T00'],
      wind_direction_10m: [350],
    });
    const m2 = makeHourly({
      time: ['T00'],
      wind_direction_10m: [10],
    });
    const result = averageHourlyArrays([m1, m2]);
    // meanAngle(350, 10) should be ~0 (or 360), not 180
    expect(result.wind_direction_10m[0]).toBeLessThan(10);
  });

  it('uses mode for weather_code', () => {
    const m1 = makeHourly({
      time: ['T00'],
      weather_code: [71], // light snow
    });
    const m2 = makeHourly({
      time: ['T00'],
      weather_code: [73], // moderate snow
    });
    const m3 = makeHourly({
      time: ['T00'],
      weather_code: [71], // light snow (tie-breaker)
    });
    const result = averageHourlyArrays([m1, m2, m3]);
    expect(result.weather_code[0]).toBe(71); // mode = 71
  });
});

/* ── averageDailyArrays ───────────────────────── */

function makeDaily(overrides: Partial<RawDaily> & { time: string[] }): RawDaily {
  const len = overrides.time.length;
  const zeros = () => new Array(len).fill(0);
  return {
    time: overrides.time,
    weather_code: overrides.weather_code ?? zeros(),
    temperature_2m_max: overrides.temperature_2m_max ?? zeros(),
    temperature_2m_min: overrides.temperature_2m_min ?? zeros(),
    apparent_temperature_max: overrides.apparent_temperature_max ?? zeros(),
    apparent_temperature_min: overrides.apparent_temperature_min ?? zeros(),
    uv_index_max: overrides.uv_index_max ?? zeros(),
    precipitation_sum: overrides.precipitation_sum ?? zeros(),
    rain_sum: overrides.rain_sum ?? zeros(),
    snowfall_sum: overrides.snowfall_sum ?? zeros(),
    precipitation_probability_max: overrides.precipitation_probability_max ?? zeros(),
    wind_speed_10m_max: overrides.wind_speed_10m_max ?? zeros(),
    wind_gusts_10m_max: overrides.wind_gusts_10m_max ?? zeros(),
  };
}

describe('averageDailyArrays', () => {
  it('throws for empty array', () => {
    expect(() => averageDailyArrays([])).toThrow();
  });

  it('returns single model unchanged', () => {
    const m = makeDaily({ time: ['2026-02-18'] });
    expect(averageDailyArrays([m])).toBe(m);
  });

  it('averages temperature max/min (mean) across models', () => {
    const m1 = makeDaily({
      time: ['2026-02-18'],
      temperature_2m_max: [-2],
      temperature_2m_min: [-10],
    });
    const m2 = makeDaily({
      time: ['2026-02-18'],
      temperature_2m_max: [-4],
      temperature_2m_min: [-14],
    });
    const result = averageDailyArrays([m1, m2]);
    expect(result.temperature_2m_max[0]).toBe(-3);
    expect(result.temperature_2m_min[0]).toBe(-12);
  });

  it('uses median for precipitation sums', () => {
    const m1 = makeDaily({ time: ['D1'], precipitation_sum: [2] });
    const m2 = makeDaily({ time: ['D1'], precipitation_sum: [3] });
    const m3 = makeDaily({ time: ['D1'], precipitation_sum: [20] }); // outlier
    const result = averageDailyArrays([m1, m2, m3]);
    expect(result.precipitation_sum[0]).toBe(3); // median
  });
});

/* ── blendWithNWS ──────────────────────────────── */

describe('blendWithNWS', () => {
  it('blends model and NWS values with default 30% NWS weight', () => {
    const modelDays = [
      { date: '2026-02-18', snowfallSum: 10 },
      { date: '2026-02-19', snowfallSum: 5 },
    ];
    const nwsMap = new Map([
      ['2026-02-18', 15],
      ['2026-02-19', 3],
    ]);
    const result = blendWithNWS(modelDays, nwsMap);
    // 0.7 * 10 + 0.3 * 15 = 7 + 4.5 = 11.5
    expect(result.get('2026-02-18')).toBe(11.5);
    // 0.7 * 5 + 0.3 * 3 = 3.5 + 0.9 = 4.4
    expect(result.get('2026-02-19')).toBe(4.4);
  });

  it('keeps model value when NWS has no data for that date', () => {
    const modelDays = [
      { date: '2026-02-18', snowfallSum: 10 },
      { date: '2026-02-19', snowfallSum: 5 },
    ];
    const nwsMap = new Map([['2026-02-18', 12]]);
    const result = blendWithNWS(modelDays, nwsMap);
    expect(result.get('2026-02-19')).toBe(5); // unchanged
  });

  it('respects custom NWS weight', () => {
    const modelDays = [{ date: '2026-02-18', snowfallSum: 10 }];
    const nwsMap = new Map([['2026-02-18', 20]]);
    const result = blendWithNWS(modelDays, nwsMap, 0.5);
    // 0.5 * 10 + 0.5 * 20 = 15
    expect(result.get('2026-02-18')).toBe(15);
  });

  it('returns model values when NWS map is empty', () => {
    const modelDays = [{ date: '2026-02-18', snowfallSum: 8 }];
    const result = blendWithNWS(modelDays, new Map());
    expect(result.get('2026-02-18')).toBe(8);
  });
});

/* ── modelsForCountry ──────────────────────────── */

describe('modelsForCountry', () => {
  it('returns HRRR for US resorts', () => {
    const models = modelsForCountry('US');
    expect(models).toContain('hrrr');
    expect(models).toContain('gfs_seamless');
    expect(models).toContain('ecmwf_ifs025');
  });

  it('returns GEM for Canadian resorts', () => {
    const models = modelsForCountry('CA');
    expect(models).toContain('gem_seamless');
    expect(models).toContain('gfs_seamless');
    expect(models).not.toContain('hrrr');
  });

  it('returns basic models for other countries', () => {
    const models = modelsForCountry('JP');
    expect(models).toEqual(['gfs_seamless', 'ecmwf_ifs025']);
  });
});
