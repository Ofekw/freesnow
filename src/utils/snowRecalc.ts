/**
 * Snow recalculation utilities.
 *
 * Open-Meteo's `snowfall` field uses a fixed ~7:1 snow-to-liquid ratio (SLR),
 * which significantly underestimates snowfall in cold mountain conditions where
 * real SLRs are 12:1–20:1.
 *
 * Additionally, the `elevation` parameter only adjusts temperature via lapse
 * rate — precipitation and the rain/snow split come from the same grid cell.
 * This means the API can report rain at sub-freezing temperatures and show
 * the same snowfall at all elevation bands.
 *
 * These utilities recalculate snowfall from total precipitation using:
 * 1. Freezing level vs station elevation to fix the rain/snow split
 * 2. Temperature-dependent SLR for realistic snowfall amounts
 */

/**
 * Multi-variable snow-to-liquid ratio.
 * Base ratio from Roebber et al. (2003) temperature lookup, then adjusted
 * by humidity and wind speed (2024-2025 research improvements):
 *
 *  - **Humidity**: Higher moisture → larger dendritic crystals → fluffier snow
 *    → higher SLR.  Very dry air produces denser, granular snow.
 *  - **Wind speed**: High wind causes mechanical compaction and sublimation
 *    → lower effective SLR at the ground.
 *
 * Returns cm of snow per mm of liquid precipitation.
 */
export function snowLiquidRatio(
  tempC: number,
  relativeHumidity?: number,
  windSpeedKmh?: number,
): number {
  if (tempC > 2) return 0;       // rain, no snow
  if (tempC > 0) return 0.5;     // wet mix, minimal accumulation

  // Base SLR from temperature
  let slr: number;
  if (tempC > -2)  slr = 1.0;    // heavy wet snow ~10:1
  else if (tempC > -5)  slr = 1.2;    // moderate snow ~12:1
  else if (tempC > -10) slr = 1.5;    // typical mountain snow ~15:1
  else if (tempC > -15) slr = 1.8;    // cold snow ~18:1
  else slr = 2.0;                     // very cold powder ~20:1

  // Humidity correction: higher moisture → larger crystals → fluffier snow
  if (relativeHumidity !== undefined) {
    if (relativeHumidity >= 90) {
      slr *= 1.15;                    // very high humidity: +15%
    } else if (relativeHumidity >= 80) {
      slr *= 1.10;                    // high humidity: +10%
    } else if (relativeHumidity < 50) {
      slr *= 0.90;                    // very dry air: −10%
    }
  }

  // Wind correction: strong wind → compaction + sublimation → less loft
  if (windSpeedKmh !== undefined) {
    if (windSpeedKmh >= 50) {
      slr *= 0.80;                    // very strong wind: −20%
    } else if (windSpeedKmh >= 30) {
      slr *= 0.90;                    // strong wind: −10%
    }
  }

  return +slr.toFixed(2);
}

export interface RecalcHourlyInput {
  precipitation: number;        // mm total precip
  rain: number;                 // mm rain (from API)
  snowfall: number;             // cm snow (from API)
  temperature: number;          // °C at station elevation
  freezingLevelHeight: number;  // m above sea level
  relativeHumidity?: number;    // 0-100 %
  windSpeed?: number;           // km/h
}

export interface RecalcHourlyOutput {
  snowfall: number; // cm recalculated
  rain: number;     // mm recalculated
}

/**
 * Recalculate a single hourly row's snow/rain split.
 *
 * When the station is above the freezing level, all precipitation falls as
 * snow.  We then apply a temperature-dependent SLR to convert the liquid
 * equivalent (mm) into snowfall depth (cm).
 */
export function recalcHourly(
  input: RecalcHourlyInput,
  stationElevation: number,
): RecalcHourlyOutput {
  const { precipitation, temperature, freezingLevelHeight, relativeHumidity, windSpeed } = input;

  if (precipitation <= 0) {
    return { snowfall: 0, rain: 0 };
  }

  // Station is well above the freezing level → all precip is snow
  if (stationElevation > freezingLevelHeight + 100) {
    // Clamp temp to ≤0°C to ensure we don't lose precip when SLR would be 0
    const clampedTemp = Math.min(temperature, 0);
    const slr = snowLiquidRatio(clampedTemp, relativeHumidity, windSpeed);
    return {
      snowfall: +(precipitation * slr).toFixed(2),
      rain: 0,
    };
  }

  // Station is near or below the freezing level → use temperature to decide
  if (temperature <= 0) {
    // Below freezing at station → snow
    const slr = snowLiquidRatio(temperature, relativeHumidity, windSpeed);
    return {
      snowfall: +(precipitation * slr).toFixed(2),
      rain: 0,
    };
  }

  if (temperature <= 2) {
    // Marginal zone: partial snow/rain mix
    const snowFraction = (2 - temperature) / 2; // linear 0–1
    const snowPrecip = precipitation * snowFraction;
    const rainPrecip = precipitation * (1 - snowFraction);
    const slr = snowLiquidRatio(temperature, relativeHumidity, windSpeed);
    return {
      snowfall: +(snowPrecip * slr).toFixed(2),
      rain: +rainPrecip.toFixed(2),
    };
  }

  // Above 2°C → all rain
  return { snowfall: 0, rain: +precipitation.toFixed(2) };
}

/**
 * Recalculate daily snowfall/rain sums from recalculated hourly data.
 * This replaces the API's daily sums which use the same flawed methodology.
 */
export function recalcDailyFromHourly(
  hourlySnowfall: number[],
  hourlyRain: number[],
): { snowfallSum: number; rainSum: number } {
  const snowfallSum = hourlySnowfall.reduce((a, b) => a + b, 0);
  const rainSum = hourlyRain.reduce((a, b) => a + b, 0);
  return {
    snowfallSum: +snowfallSum.toFixed(2),
    rainSum: +rainSum.toFixed(2),
  };
}
