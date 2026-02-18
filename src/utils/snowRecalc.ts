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
 * Temperature-dependent snow-to-liquid ratio.
 * Based on the Roebber et al. (2003) method simplified for operational use.
 * Returns cm of snow per mm of liquid precipitation.
 */
export function snowLiquidRatio(tempC: number): number {
  if (tempC > 2) return 0;       // rain, no snow
  if (tempC > 0) return 0.5;     // wet mix, minimal accumulation
  if (tempC > -2) return 1.0;    // heavy wet snow ~10:1
  if (tempC > -5) return 1.2;    // moderate snow ~12:1
  if (tempC > -10) return 1.5;   // typical mountain snow ~15:1
  if (tempC > -15) return 1.8;   // cold snow ~18:1
  return 2.0;                    // very cold powder ~20:1
}

export interface RecalcHourlyInput {
  precipitation: number;  // mm total precip
  rain: number;           // mm rain (from API)
  snowfall: number;       // cm snow (from API)
  temperature: number;    // °C at station elevation
  freezingLevelHeight: number; // m above sea level
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
  const { precipitation, temperature, freezingLevelHeight } = input;

  if (precipitation <= 0) {
    return { snowfall: 0, rain: 0 };
  }

  // Station is well above the freezing level → all precip is snow
  if (stationElevation > freezingLevelHeight + 100) {
    // Clamp temp to ≤0°C to ensure we don't lose precip when SLR would be 0
    const clampedTemp = Math.min(temperature, 0);
    const slr = snowLiquidRatio(clampedTemp);
    return {
      snowfall: +(precipitation * slr).toFixed(2),
      rain: 0,
    };
  }

  // Station is near or below the freezing level → use temperature to decide
  if (temperature <= 0) {
    // Below freezing at station → snow
    const slr = snowLiquidRatio(temperature);
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
    const slr = snowLiquidRatio(temperature);
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
