import { describe, expect, it } from 'bun:test';
import { readFile } from 'node:fs/promises';

describe('screenshot mock forecast data', () => {
  it('includes all daily fields required by forecast mapping', async () => {
    const mockUrl = new URL('../mocks/crystal-mountain-forecast.json', import.meta.url);
    const mock = JSON.parse(await readFile(mockUrl, 'utf-8'));
    const daily = mock.daily as Record<string, unknown>;
    const dayCount = (daily.time as unknown[]).length;

    for (const key of [
      'time',
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'uv_index_max',
      'precipitation_sum',
      'rain_sum',
      'snowfall_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
    ]) {
      expect(Array.isArray(daily[key])).toBe(true);
      expect((daily[key] as unknown[]).length).toBe(dayCount);
    }
  });
});
