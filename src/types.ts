/* ── ElevationBand toggle ───────────────────────── */

/** Elevation band (base / mid / top) is toggled via a segmented control. */
export type ElevationBand = 'base' | 'mid' | 'top';

/* ── Resort ─────────────────────────────────────── */

export interface ResortElevation {
  /** Meters above sea level */
  base: number;
  mid: number;
  top: number;
}

export interface Resort {
  /** URL-safe unique slug, e.g. "vail-co" */
  slug: string;
  name: string;
  /** State / province / region label */
  region: string;
  country: string;
  lat: number;
  lon: number;
  elevation: ResortElevation;
  /** Total skiable vertical in meters */
  verticalDrop: number;
  /** Number of lifts (informational) */
  lifts?: number;
  /** Total skiable acres (informational) */
  acres?: number;
  /** URL to resort website */
  website?: string;
}

/* ── Hourly weather row ─────────────────────────── */

export interface HourlyMetrics {
  /** ISO-8601 datetime string */
  time: string;
  /** °C */
  temperature: number;
  /** °C */
  apparentTemperature: number;
  /** 0-100 % */
  relativeHumidity: number;
  /** mm */
  precipitation: number;
  /** mm */
  rain: number;
  /** cm */
  snowfall: number;
  /** % probability */
  precipitationProbability: number;
  /** WMO weather code */
  weatherCode: number;
  /** km/h */
  windSpeed: number;
  /** ° */
  windDirection: number;
  /** km/h */
  windGusts: number;
  /** m above sea level */
  freezingLevelHeight: number;
  /** m snow depth (from model, for validation) */
  snowDepth?: number;
}

/* ── Daily weather row ──────────────────────────── */

export interface DailyMetrics {
  /** ISO-8601 date string */
  date: string;
  /** WMO weather code (dominant) */
  weatherCode: number;
  /** °C */
  temperatureMax: number;
  /** °C */
  temperatureMin: number;
  /** °C */
  apparentTemperatureMax: number;
  /** °C */
  apparentTemperatureMin: number;
  /** UV index (max in day) */
  uvIndexMax: number;
  /** mm total */
  precipitationSum: number;
  /** mm */
  rainSum: number;
  /** cm */
  snowfallSum: number;
  /** % max */
  precipitationProbabilityMax: number;
  /** km/h */
  windSpeedMax: number;
  /** km/h */
  windGustsMax: number;
}

/* ── Forecast bundle for one elevation band ─────── */

export interface BandForecast {
  band: ElevationBand;
  elevation: number;
  hourly: HourlyMetrics[];
  daily: DailyMetrics[];
}

/* ── Full forecast for a resort ─────────────────── */

export interface ResortForecast {
  resort: Resort;
  /** UTC timestamp when fetched */
  fetchedAt: string;
  base: BandForecast;
  mid: BandForecast;
  top: BandForecast;
}

/* ── Historical snowfall record ─────────────────── */

export interface HistoricalSnowDay {
  date: string;
  /** cm */
  snowfall: number;
  /** cm */
  snowDepth: number;
  /** °C */
  temperatureMax: number;
  /** °C */
  temperatureMin: number;
}

export interface HistoricalSnowData {
  resort: Resort;
  days: HistoricalSnowDay[];
  /** Date range */
  from: string;
  to: string;
}

/* ── Favourites ─────────────────────────────────── */

export interface FavoriteResort {
  slug: string;
  addedAt: string;
}
