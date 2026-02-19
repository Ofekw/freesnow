/**
 * Multi-model averaging utilities.
 *
 * Given N raw Open-Meteo forecast responses (one per weather model), these
 * functions align the time arrays and compute element-wise averages for all
 * numerical weather variables.  This is the single highest-impact technique
 * for improving forecast accuracy — it smooths out individual model biases
 * and reduces RMSE by 15-30 % vs any single model.
 *
 * Precipitation fields use the **median** to resist outlier spikes from a
 * single model.  Temperature and other continuous fields use the **mean**.
 */

/* ── generic helpers ────────────────────────────── */

/** Arithmetic mean of a non-empty number array. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/** Median of a non-empty number array. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/** Round to two decimals (for weather values). */
function r2(n: number): number {
  return +n.toFixed(2);
}

/* ── types mirroring the OMForecastResponse shapes ─ */
/* We re-declare the inner structures so this module has no import dependency
   on openmeteo.ts and can be tested in isolation. */

export interface RawHourly {
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
}

export interface RawDaily {
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
}

/* ── hourly averaging ──────────────────────────── */

/**
 * Merge N hourly datasets into one.
 *
 * - Takes the **union** of all time steps so that short-range models (e.g.
 *   HRRR 48 h) contribute where they can and longer-range models cover the
 *   rest.
 * - Precipitation, rain, snowfall use **median** (robust to outliers).
 * - Weather code uses **mode** (most common code wins).
 * - All other fields use **mean**.
 */
export function averageHourlyArrays(models: RawHourly[]): RawHourly {
  if (models.length === 0) throw new Error('No model data to average');
  if (models.length === 1) return models[0]!;

  // Build index: time → model index → row index
  const timeSet = new Set<string>();
  const modelTimeIndex: Map<string, number>[] = models.map((m) => {
    const idx = new Map<string, number>();
    m.time.forEach((t, i) => {
      idx.set(t, i);
      timeSet.add(t);
    });
    return idx;
  });

  // Sorted union of all time steps
  const times = [...timeSet].sort();

  // Check if any models provide snow_depth
  const hasSnowDepth = models.some((m) => m.snow_depth && m.snow_depth.length > 0);

  // Pre-allocate output arrays
  const out: RawHourly = {
    time: [],
    temperature_2m: [],
    apparent_temperature: [],
    relative_humidity_2m: [],
    precipitation: [],
    rain: [],
    snowfall: [],
    precipitation_probability: [],
    weather_code: [],
    wind_speed_10m: [],
    wind_direction_10m: [],
    wind_gusts_10m: [],
    freezing_level_height: [],
    ...(hasSnowDepth ? { snow_depth: [] } : {}),
  };

  for (const t of times) {
    // Collect values from models that have this time step
    const temps: number[] = [];
    const apparents: number[] = [];
    const humidities: number[] = [];
    const precips: number[] = [];
    const rains: number[] = [];
    const snowfalls: number[] = [];
    const precipProbs: number[] = [];
    const wcodes: number[] = [];
    const winds: number[] = [];
    const windDirs: number[] = [];
    const gusts: number[] = [];
    const freezingLevels: number[] = [];
    const snowDepths: number[] = [];

    for (let m = 0; m < models.length; m++) {
      const idx = modelTimeIndex[m]!.get(t);
      if (idx === undefined) continue;
      const model = models[m]!;

      // Guard against null values — some models (e.g. HRRR) return null for
      // fields they don't support.  Only push real numbers.
      if (model.temperature_2m[idx] != null) temps.push(model.temperature_2m[idx]!);
      if (model.apparent_temperature[idx] != null) apparents.push(model.apparent_temperature[idx]!);
      if (model.relative_humidity_2m[idx] != null) humidities.push(model.relative_humidity_2m[idx]!);
      if (model.precipitation[idx] != null) precips.push(model.precipitation[idx]!);
      if (model.rain[idx] != null) rains.push(model.rain[idx]!);
      if (model.snowfall[idx] != null) snowfalls.push(model.snowfall[idx]!);
      if (model.precipitation_probability[idx] != null) precipProbs.push(model.precipitation_probability[idx]!);
      if (model.weather_code[idx] != null) wcodes.push(model.weather_code[idx]!);
      if (model.wind_speed_10m[idx] != null) winds.push(model.wind_speed_10m[idx]!);
      if (model.wind_direction_10m[idx] != null) windDirs.push(model.wind_direction_10m[idx]!);
      if (model.wind_gusts_10m[idx] != null) gusts.push(model.wind_gusts_10m[idx]!);
      if (model.freezing_level_height[idx] != null) freezingLevels.push(model.freezing_level_height[idx]!);
      if (model.snow_depth?.[idx] != null) {
        snowDepths.push(model.snow_depth[idx]!);
      }
    }

    // Skip time steps where no model provided usable data for core fields
    if (temps.length === 0) continue;

    out.time.push(t);
    out.temperature_2m.push(r2(mean(temps)));
    out.apparent_temperature.push(apparents.length > 0 ? r2(mean(apparents)) : r2(mean(temps)));
    out.relative_humidity_2m.push(humidities.length > 0 ? r2(mean(humidities)) : 0);
    out.precipitation.push(precips.length > 0 ? r2(median(precips)) : 0);
    out.rain.push(rains.length > 0 ? r2(median(rains)) : 0);
    out.snowfall.push(snowfalls.length > 0 ? r2(median(snowfalls)) : 0);
    out.precipitation_probability.push(precipProbs.length > 0 ? r2(mean(precipProbs)) : 0);
    out.weather_code.push(wcodes.length > 0 ? mode(wcodes) : 0);
    out.wind_speed_10m.push(winds.length > 0 ? r2(mean(winds)) : 0);
    out.wind_direction_10m.push(windDirs.length > 0 ? r2(meanAngle(windDirs)) : 0);
    out.wind_gusts_10m.push(gusts.length > 0 ? r2(mean(gusts)) : 0);
    out.freezing_level_height.push(freezingLevels.length > 0 ? r2(mean(freezingLevels)) : 0);
    if (hasSnowDepth && snowDepths.length > 0) {
      out.snow_depth!.push(r2(mean(snowDepths)));
    } else if (hasSnowDepth) {
      out.snow_depth!.push(0);
    }
  }

  return out;
}

/* ── daily averaging ───────────────────────────── */

/**
 * Merge N daily datasets into one.
 * Same strategy: median for precip fields, mean for temperature/wind, mode
 * for weather code.
 */
export function averageDailyArrays(models: RawDaily[]): RawDaily {
  if (models.length === 0) throw new Error('No model data to average');
  if (models.length === 1) return models[0]!;

  const timeSet = new Set<string>();
  const modelTimeIndex: Map<string, number>[] = models.map((m) => {
    const idx = new Map<string, number>();
    m.time.forEach((t, i) => {
      idx.set(t, i);
      timeSet.add(t);
    });
    return idx;
  });

  const times = [...timeSet].sort();

  const out: RawDaily = {
    time: [],
    weather_code: [],
    temperature_2m_max: [],
    temperature_2m_min: [],
    apparent_temperature_max: [],
    apparent_temperature_min: [],
    uv_index_max: [],
    precipitation_sum: [],
    rain_sum: [],
    snowfall_sum: [],
    precipitation_probability_max: [],
    wind_speed_10m_max: [],
    wind_gusts_10m_max: [],
  };

  for (const t of times) {
    const wcodes: number[] = [];
    const tmaxs: number[] = [];
    const tmins: number[] = [];
    const atMaxs: number[] = [];
    const atMins: number[] = [];
    const uvs: number[] = [];
    const precipSums: number[] = [];
    const rainSums: number[] = [];
    const snowSums: number[] = [];
    const ppMaxs: number[] = [];
    const wsMaxs: number[] = [];
    const wgMaxs: number[] = [];

    for (let m = 0; m < models.length; m++) {
      const idx = modelTimeIndex[m]!.get(t);
      if (idx === undefined) continue;
      const model = models[m]!;
      if (model.weather_code[idx] != null) wcodes.push(model.weather_code[idx]!);
      if (model.temperature_2m_max[idx] != null) tmaxs.push(model.temperature_2m_max[idx]!);
      if (model.temperature_2m_min[idx] != null) tmins.push(model.temperature_2m_min[idx]!);
      if (model.apparent_temperature_max[idx] != null) atMaxs.push(model.apparent_temperature_max[idx]!);
      if (model.apparent_temperature_min[idx] != null) atMins.push(model.apparent_temperature_min[idx]!);
      if (model.uv_index_max[idx] != null) uvs.push(model.uv_index_max[idx]!);
      if (model.precipitation_sum[idx] != null) precipSums.push(model.precipitation_sum[idx]!);
      if (model.rain_sum[idx] != null) rainSums.push(model.rain_sum[idx]!);
      if (model.snowfall_sum[idx] != null) snowSums.push(model.snowfall_sum[idx]!);
      if (model.precipitation_probability_max[idx] != null) ppMaxs.push(model.precipitation_probability_max[idx]!);
      if (model.wind_speed_10m_max[idx] != null) wsMaxs.push(model.wind_speed_10m_max[idx]!);
      if (model.wind_gusts_10m_max[idx] != null) wgMaxs.push(model.wind_gusts_10m_max[idx]!);
    }

    // Skip days where no model provided usable temperature data
    if (tmaxs.length === 0) continue;

    out.time.push(t);
    out.weather_code.push(wcodes.length > 0 ? mode(wcodes) : 0);
    out.temperature_2m_max.push(r2(mean(tmaxs)));
    out.temperature_2m_min.push(tmins.length > 0 ? r2(mean(tmins)) : r2(mean(tmaxs)));
    out.apparent_temperature_max.push(atMaxs.length > 0 ? r2(mean(atMaxs)) : r2(mean(tmaxs)));
    out.apparent_temperature_min.push(atMins.length > 0 ? r2(mean(atMins)) : r2(mean(tmins.length > 0 ? tmins : tmaxs)));
    out.uv_index_max.push(uvs.length > 0 ? r2(mean(uvs)) : 0);
    out.precipitation_sum.push(precipSums.length > 0 ? r2(median(precipSums)) : 0);
    out.rain_sum.push(rainSums.length > 0 ? r2(median(rainSums)) : 0);
    out.snowfall_sum.push(snowSums.length > 0 ? r2(median(snowSums)) : 0);
    out.precipitation_probability_max.push(ppMaxs.length > 0 ? r2(mean(ppMaxs)) : 0);
    out.wind_speed_10m_max.push(wsMaxs.length > 0 ? r2(mean(wsMaxs)) : 0);
    out.wind_gusts_10m_max.push(wgMaxs.length > 0 ? r2(mean(wgMaxs)) : 0);
  }

  return out;
}

/* ── NWS blending ──────────────────────────────── */

/**
 * Blend Open-Meteo recalculated daily snowfall with NWS daily snowfall.
 *
 * @param modelSnowDays  - Array of { date, snowfallSum } from multi-model
 * @param nwsSnowMap     - Map of date → cm snowfall from NWS
 * @param nwsWeight      - Weight for NWS signal (default 0.3)
 * @returns Map of date → blended snowfall (cm)
 */
export function blendWithNWS(
  modelSnowDays: Array<{ date: string; snowfallSum: number }>,
  nwsSnowMap: Map<string, number>,
  nwsWeight: number = 0.3,
): Map<string, number> {
  const result = new Map<string, number>();
  const modelWeight = 1 - nwsWeight;

  for (const day of modelSnowDays) {
    const nwsValue = nwsSnowMap.get(day.date);
    if (nwsValue !== undefined) {
      result.set(day.date, r2(modelWeight * day.snowfallSum + nwsWeight * nwsValue));
    } else {
      // No NWS data for this date → keep model value as-is
      result.set(day.date, day.snowfallSum);
    }
  }

  return result;
}

/* ── small helpers ─────────────────────────────── */

/** Mode (most common value). Ties go to the first occurrence. */
function mode(values: number[]): number {
  if (values.length === 0) return 0;
  const counts = new Map<number, number>();
  let best = values[0]!;
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > bestCount) {
      bestCount = c;
      best = v;
    }
  }
  return best;
}

/**
 * Average of angles (degrees).  Uses vector decomposition to avoid the
 * wrap-around problem (e.g. averaging 350° and 10° should give 0°, not 180°).
 */
function meanAngle(degrees: number[]): number {
  if (degrees.length === 0) return 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const d of degrees) {
    const rad = (d * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  const avg = (Math.atan2(sinSum / degrees.length, cosSum / degrees.length) * 180) / Math.PI;
  return ((avg % 360) + 360) % 360; // normalize to [0, 360)
}

/* ── model selection ───────────────────────────── */

/**
 * Choose which Open-Meteo models to fetch based on the resort's country.
 *
 * Uses GFS + ECMWF as baseline global models for all regions.
 * Canadian resorts additionally include GEM (Environment Canada).
 *
 * Note: HRRR (`ncep_hrrr_conus_15min`) was evaluated but excluded because
 * it returns 87% null values over a 7-day window (only covers ~48h) and
 * doesn't support several fields (apparent_temperature, humidity, weather_code,
 * freezing_level_height, precipitation_probability).  The marginal benefit
 * doesn't justify the data quality issues.
 */
export function modelsForCountry(country: string): string[] {
  switch (country) {
    case 'CA':
      return ['gfs_seamless', 'ecmwf_ifs025', 'gem_seamless'];
    default:
      return ['gfs_seamless', 'ecmwf_ifs025'];
  }
}
