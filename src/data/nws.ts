/**
 * NWS Weather.gov API client — US-only, free, no API key, CORS-enabled.
 *
 * Provides quantitative snowfall forecasts from the National Weather Service.
 * NWS forecasters manually adjust QPF and snow ratios for local conditions,
 * adding "human intelligence" to our pipeline.
 *
 * Two-step lookup:
 *   1. GET /points/{lat},{lon}         → gridId, gridX, gridY
 *   2. GET /gridpoints/{id}/{x},{y}/forecastGridData → snowfallAmount
 *
 * The snowfallAmount field contains ISO 8601 interval/duration pairs with
 * values in meters.  We convert to cm and bucket into daily totals.
 */

const NWS_BASE = 'https://api.weather.gov';

/* ── types ──────────────────────────────────────── */

interface NWSPointsResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
  };
}

interface NWSGridValue {
  validTime: string; // e.g. "2026-02-18T06:00:00+00:00/PT6H"
  value: number | null;
}

interface NWSGridDataResponse {
  properties: {
    snowfallAmount?: {
      uom: string;
      values: NWSGridValue[];
    };
  };
}

export interface NWSDailySnowfall {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Snowfall in cm */
  snowfallCm: number;
}

/* ── helpers ────────────────────────────────────── */

async function nwsFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/geo+json',
      'User-Agent': 'FreeSnow/1.0 (https://github.com/Ofekw/freesnow)',
    },
  });
  if (!res.ok) throw new Error(`NWS ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

/**
 * Parse an ISO 8601 interval string into start date (YYYY-MM-DD) and duration
 * in hours.  Example: "2026-02-18T06:00:00+00:00/PT6H" → { date: "2026-02-18", hours: 6 }
 */
function parseInterval(validTime: string): { startDate: string; hours: number } | null {
  const parts = validTime.split('/');
  if (parts.length !== 2) return null;

  const startDate = parts[0]!.slice(0, 10); // "YYYY-MM-DD"

  // Parse ISO 8601 duration (e.g. PT6H, PT12H, P1D, PT1H)
  const dur = parts[1]!;
  let hours = 0;
  const dayMatch = dur.match(/(\d+)D/);
  const hourMatch = dur.match(/(\d+)H/);
  if (dayMatch) hours += parseInt(dayMatch[1]!, 10) * 24;
  if (hourMatch) hours += parseInt(hourMatch[1]!, 10);
  if (hours === 0) hours = 1; // fallback

  return { startDate, hours };
}

/* ── public API ─────────────────────────────────── */

/**
 * Fetch NWS gridpoint metadata for a lat/lon coordinate.
 * Returns the grid office ID, gridX, and gridY needed for data fetch.
 * Throws if the location is outside NWS coverage (non-US).
 */
export async function fetchNWSGridpoint(
  lat: number,
  lon: number,
): Promise<{ gridId: string; gridX: number; gridY: number }> {
  const url = `${NWS_BASE}/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
  const data = await nwsFetch<NWSPointsResponse>(url);
  return {
    gridId: data.properties.gridId,
    gridX: data.properties.gridX,
    gridY: data.properties.gridY,
  };
}

/**
 * Fetch NWS quantitative snowfall forecast for a gridpoint.
 * Returns daily snowfall amounts in cm for the next several days.
 *
 * Gracefully returns an empty array on any error (NWS is occasionally
 * unreliable with 500 errors).
 */
export async function fetchNWSSnowfall(
  lat: number,
  lon: number,
): Promise<NWSDailySnowfall[]> {
  try {
    const { gridId, gridX, gridY } = await fetchNWSGridpoint(lat, lon);

    const url = `${NWS_BASE}/gridpoints/${gridId}/${gridX},${gridY}`;
    const data = await nwsFetch<NWSGridDataResponse>(url);

    const snowfallValues = data.properties.snowfallAmount?.values;
    if (!snowfallValues || snowfallValues.length === 0) return [];

    // Determine unit multiplier (API returns meters by default)
    const uom = data.properties.snowfallAmount?.uom ?? '';
    const toCm = uom.includes('m') && !uom.includes('mm') ? 100 : uom.includes('mm') ? 0.1 : 100;

    // Bucket intervals into daily totals
    const dailyMap = new Map<string, number>();

    for (const entry of snowfallValues) {
      if (entry.value === null || entry.value <= 0) continue;

      const parsed = parseInterval(entry.validTime);
      if (!parsed) continue;

      const valueCm = entry.value * toCm;

      // For intervals spanning multiple days, we distribute evenly
      // For simplicity, assign the full value to the start date
      // (most NWS intervals are 6h, fitting well within a single day)
      const existing = dailyMap.get(parsed.startDate) ?? 0;
      dailyMap.set(parsed.startDate, existing + valueCm);
    }

    return [...dailyMap.entries()]
      .map(([date, snowfallCm]) => ({
        date,
        snowfallCm: +snowfallCm.toFixed(2),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    // NWS is occasionally unreliable — treat as optional enhancement
    return [];
  }
}

/**
 * Convert NWS daily snowfall array into a Map<date, cm> for easy blending.
 */
export function nwsToSnowMap(days: NWSDailySnowfall[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of days) {
    map.set(d.date, d.snowfallCm);
  }
  return map;
}
