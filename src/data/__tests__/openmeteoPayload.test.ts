import { describe, it, expect } from 'bun:test';
import { isForecastResponsePayload } from '@/data/openmeteo';
import type { OMForecastResponse } from '@/data/openmeteo';

function makeValidPayload(): OMForecastResponse {
  return {
    hourly: {
      time: ['2026-02-25T00:00'],
      temperature_2m: [0],
      apparent_temperature: [0],
      relative_humidity_2m: [70],
      precipitation: [0],
      rain: [0],
      snowfall: [0],
      precipitation_probability: [10],
      weather_code: [0],
      wind_speed_10m: [5],
      wind_direction_10m: [180],
      wind_gusts_10m: [8],
      freezing_level_height: [2000],
      snow_depth: [0],
    },
    daily: {
      time: ['2026-02-25'],
      weather_code: [0],
      temperature_2m_max: [2],
      temperature_2m_min: [-2],
      apparent_temperature_max: [2],
      apparent_temperature_min: [-2],
      uv_index_max: [3],
      precipitation_sum: [0],
      rain_sum: [0],
      snowfall_sum: [0],
      precipitation_probability_max: [10],
      wind_speed_10m_max: [6],
      wind_gusts_10m_max: [9],
    },
  };
}

describe('isForecastResponsePayload', () => {
  it('returns true for valid forecast payloads', () => {
    expect(isForecastResponsePayload(makeValidPayload())).toBe(true);
  });

  it('returns false for API error-shaped payloads', () => {
    expect(isForecastResponsePayload({ error: true, reason: 'model unavailable' })).toBe(false);
  });

  it('returns false when required arrays are missing', () => {
    const invalid = makeValidPayload() as unknown as {
      hourly: Partial<OMForecastResponse['hourly']>;
      daily: OMForecastResponse['daily'];
    };
    delete invalid.hourly.precipitation_probability;
    expect(isForecastResponsePayload(invalid)).toBe(false);
  });
});
