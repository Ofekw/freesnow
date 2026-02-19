/**
 * Open-Meteo API client — works entirely in the browser, no API key needed.
 * https://open-meteo.com/en/docs
 */

import type {
  HourlyMetrics,
  DailyMetrics,
  BandForecast,
  ElevationBand,
  HistoricalSnowDay,
} from '@/types';
import { recalcHourly, recalcDailyFromHourly } from '@/utils/snowRecalc';
import { averageHourlyArrays, averageDailyArrays } from '@/utils/modelAverage';
import type { RawHourly, RawDaily } from '@/utils/modelAverage';

const BASE = 'https://api.open-meteo.com/v1';

/* ── helpers ────────────────────────────────────── */

function qs(params: Record<string, string | number | boolean>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function fetchJSON<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json() as Promise<T>;
    // Retry on 429 (rate limit) and 5xx with exponential backoff
    if ((res.status === 429 || res.status >= 500) && attempt < retries - 1) {
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    throw new Error(`Open-Meteo ${res.status}: ${res.statusText}`);
  }
  throw new Error('Open-Meteo: max retries exceeded');
}

/* ── Forecast ───────────────────────────────────── */

const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'rain',
  'snowfall',
  'precipitation_probability',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'freezing_level_height',
  'snow_depth',
].join(',');

const DAILY_VARS = [
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
].join(',');

export interface OMForecastResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    precipitation: number[];
    rain: number[];
    snowfall: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    freezing_level_height: number[];
    snow_depth?: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    uv_index_max: number[];
    precipitation_sum: number[];
    rain_sum: number[];
    snowfall_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
  };
}

function mapHourly(raw: OMForecastResponse['hourly'], elevation: number): HourlyMetrics[] {
  return raw.time.map((t, i) => {
    const { snowfall, rain } = recalcHourly(
      {
        precipitation: raw.precipitation[i]!,
        rain: raw.rain[i]!,
        snowfall: raw.snowfall[i]!,
        temperature: raw.temperature_2m[i]!,
        freezingLevelHeight: raw.freezing_level_height[i]!,
        relativeHumidity: raw.relative_humidity_2m[i],
        windSpeed: raw.wind_speed_10m[i],
      },
      elevation,
    );
    return {
      time: t,
      temperature: raw.temperature_2m[i]!,
      apparentTemperature: raw.apparent_temperature[i]!,
      relativeHumidity: raw.relative_humidity_2m[i]!,
      precipitation: raw.precipitation[i]!,
      rain,
      snowfall,
      precipitationProbability: raw.precipitation_probability[i]!,
      weatherCode: raw.weather_code[i]!,
      windSpeed: raw.wind_speed_10m[i]!,
      windDirection: raw.wind_direction_10m[i]!,
      windGusts: raw.wind_gusts_10m[i]!,
      freezingLevelHeight: raw.freezing_level_height[i]!,
      snowDepth: raw.snow_depth?.[i],
    };
  });
}

function mapDaily(
  raw: OMForecastResponse['daily'],
  hourly: HourlyMetrics[],
): DailyMetrics[] {
  return raw.time.map((t, i) => {
    // Recompute daily snow/rain sums from recalculated hourly data
    const dayHourly = hourly.filter((h) => h.time.startsWith(t));
    const { snowfallSum, rainSum } = recalcDailyFromHourly(
      dayHourly.map((h) => h.snowfall),
      dayHourly.map((h) => h.rain),
    );

    return {
      date: t,
      weatherCode: raw.weather_code[i]!,
      temperatureMax: raw.temperature_2m_max[i]!,
      temperatureMin: raw.temperature_2m_min[i]!,
      apparentTemperatureMax: raw.apparent_temperature_max[i]!,
      apparentTemperatureMin: raw.apparent_temperature_min[i]!,
      uvIndexMax: raw.uv_index_max[i]!,
      precipitationSum: raw.precipitation_sum[i]!,
      rainSum,
      snowfallSum,
      precipitationProbabilityMax: raw.precipitation_probability_max[i]!,
      windSpeedMax: raw.wind_speed_10m_max[i]!,
      windGustsMax: raw.wind_gusts_10m_max[i]!,
    };
  });
}

export async function fetchForecast(
  lat: number,
  lon: number,
  elevation: number,
  band: ElevationBand,
  forecastDays: number = 7,
  pastDays: number = 0,
  timezone: string = 'auto',
): Promise<BandForecast> {
  const params: Record<string, string | number | boolean> = {
    latitude: lat,
    longitude: lon,
    elevation,
    hourly: HOURLY_VARS,
    daily: DAILY_VARS,
    timezone,
    forecast_days: forecastDays,
  };
  if (pastDays > 0) params.past_days = pastDays;
  const url = `${BASE}/forecast?${qs(params)}`;

  const data = await fetchJSON<OMForecastResponse>(url);
  const hourly = mapHourly(data.hourly, elevation);
  return {
    band,
    elevation,
    hourly,
    daily: mapDaily(data.daily, hourly),
  };
}

/* ── Multi-Model Forecast ──────────────────────── */

/** Response shape when multiple models are requested in a single call. */
interface OMMultiModelResponse {
  hourly: Record<string, (number | null)[]> & { time: string[] };
  daily: Record<string, (number | null)[]> & { time: string[] };
}

/** Hourly variable names (without model suffix). */
const HOURLY_KEYS: (keyof RawHourly)[] = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m',
  'precipitation', 'rain', 'snowfall', 'precipitation_probability',
  'weather_code', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
  'freezing_level_height', 'snow_depth',
];

/** Daily variable names (without model suffix). */
const DAILY_KEYS: (keyof RawDaily)[] = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min',
  'apparent_temperature_max', 'apparent_temperature_min', 'uv_index_max',
  'precipitation_sum', 'rain_sum', 'snowfall_sum',
  'precipitation_probability_max', 'wind_speed_10m_max', 'wind_gusts_10m_max',
];

/**
 * Split a multi-model response (fields suffixed with `_modelName`) into
 * separate per-model RawHourly / RawDaily arrays for the averaging pipeline.
 */
function splitMultiModelResponse(
  data: OMMultiModelResponse,
  models: string[],
): { hourlyModels: RawHourly[]; dailyModels: RawDaily[] } {
  const hourlyModels: RawHourly[] = [];
  const dailyModels: RawDaily[] = [];

  for (const model of models) {
    // -- Hourly --
    const h: Record<string, number[]> = { time: [] as unknown as number[] };
    let hasAnyHourly = false;
    for (const key of HOURLY_KEYS) {
      const suffixed = `${key}_${model}`;
      if (suffixed in data.hourly) {
        h[key] = data.hourly[suffixed] as number[];
        hasAnyHourly = true;
      }
    }
    if (hasAnyHourly) {
      hourlyModels.push({ time: data.hourly.time, ...h } as unknown as RawHourly);
    }

    // -- Daily --
    const d: Record<string, number[]> = { time: [] as unknown as number[] };
    let hasAnyDaily = false;
    for (const key of DAILY_KEYS) {
      const suffixed = `${key}_${model}`;
      if (suffixed in data.daily) {
        d[key] = data.daily[suffixed] as number[];
        hasAnyDaily = true;
      }
    }
    if (hasAnyDaily) {
      dailyModels.push({ time: data.daily.time, ...d } as unknown as RawDaily);
    }
  }

  return { hourlyModels, dailyModels };
}

/**
 * Fetch a single Open-Meteo request with all models combined.
 * The API returns fields suffixed by model name (e.g. `temperature_2m_gfs_seamless`).
 * We split, average, then run the SLR recalculation.
 *
 * This uses **1 API call** instead of N (one per model), dramatically
 * reducing rate-limit pressure.
 */
export async function fetchMultiModelForecast(
  lat: number,
  lon: number,
  elevation: number,
  band: ElevationBand,
  models: string[],
  forecastDays: number = 7,
  pastDays: number = 0,
  timezone: string = 'auto',
): Promise<BandForecast> {
  const params: Record<string, string | number | boolean> = {
    latitude: lat,
    longitude: lon,
    elevation,
    hourly: HOURLY_VARS,
    daily: DAILY_VARS,
    timezone,
    forecast_days: forecastDays,
    models: models.join(','),
  };
  if (pastDays > 0) params.past_days = pastDays;
  const url = `${BASE}/forecast?${qs(params)}`;

  let data: OMMultiModelResponse;
  try {
    data = await fetchJSON<OMMultiModelResponse>(url);
  } catch {
    // If multi-model request fails, fall back to default best_match
    return fetchForecast(lat, lon, elevation, band, forecastDays, pastDays, timezone);
  }

  const { hourlyModels, dailyModels } = splitMultiModelResponse(data, models);

  // If split produced nothing usable, fall back
  if (hourlyModels.length === 0) {
    return fetchForecast(lat, lon, elevation, band, forecastDays, pastDays, timezone);
  }

  const avgHourly = averageHourlyArrays(hourlyModels);
  const avgDaily = dailyModels.length > 0
    ? averageDailyArrays(dailyModels)
    : null;

  const hourly = mapHourly(avgHourly as OMForecastResponse['hourly'], elevation);
  return {
    band,
    elevation,
    hourly,
    daily: avgDaily
      ? mapDaily(avgDaily as OMForecastResponse['daily'], hourly)
      : [],
  };
}

/* ── Historical ────────────────────────────────── */

interface OMHistoricalResponse {
  daily: {
    time: string[];
    snowfall_sum: number[];
    snow_depth_max?: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export async function fetchHistorical(
  lat: number,
  lon: number,
  elevation: number,
  startDate: string,
  endDate: string,
  timezone: string = 'auto',
): Promise<HistoricalSnowDay[]> {
  const url = `${BASE}/archive?${qs({
    latitude: lat,
    longitude: lon,
    elevation,
    start_date: startDate,
    end_date: endDate,
    daily: 'snowfall_sum,snow_depth_max,temperature_2m_max,temperature_2m_min',
    timezone,
  })}`;

  const data = await fetchJSON<OMHistoricalResponse>(url);
  return data.daily.time.map((t, i) => ({
    date: t,
    snowfall: data.daily.snowfall_sum[i]!,
    snowDepth: data.daily.snow_depth_max?.[i] ?? 0,
    temperatureMax: data.daily.temperature_2m_max[i]!,
    temperatureMin: data.daily.temperature_2m_min[i]!,
  }));
}
