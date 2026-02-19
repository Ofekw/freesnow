import { useState, useEffect, useCallback } from 'react';
import type { Resort, ResortForecast, BandForecast, HistoricalSnowDay } from '@/types';
import { fetchHistorical, fetchMultiModelForecast } from '@/data/openmeteo';
import { fetchNWSSnowfall, nwsToSnowMap } from '@/data/nws';
import { modelsForCountry, blendWithNWS } from '@/utils/modelAverage';
import { useTimezone } from '@/context/TimezoneContext';

/* ── NWS blending helper ─────────────────────────── */

/**
 * Apply NWS blending to a single BandForecast's daily snowfall sums.
 * Mutates the band in place and returns it for convenience.
 */
function applyNWSBlend(band: BandForecast, nwsSnowMap: Map<string, number>): BandForecast {
  if (nwsSnowMap.size === 0) return band;

  const blended = blendWithNWS(band.daily, nwsSnowMap);
  for (const day of band.daily) {
    const blendedValue = blended.get(day.date);
    if (blendedValue !== undefined) {
      day.snowfallSum = blendedValue;
    }
  }
  return band;
}

/* ── useForecast ─────────────────────────────────── */

interface UseForecastResult {
  forecast: ResortForecast | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useForecast(resort: Resort | undefined): UseForecastResult {
  const [forecast, setForecast] = useState<ResortForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tz } = useTimezone();

  const load = useCallback(async () => {
    if (!resort) return;
    setLoading(true);
    setError(null);
    try {
      const models = modelsForCountry(resort.country);

      // Fetch multi-model forecasts for all 3 bands in parallel
      const [base, mid, top] = await Promise.all([
        fetchMultiModelForecast(resort.lat, resort.lon, resort.elevation.base, 'base', models, 7, 0, tz),
        fetchMultiModelForecast(resort.lat, resort.lon, resort.elevation.mid, 'mid', models, 7, 0, tz),
        fetchMultiModelForecast(resort.lat, resort.lon, resort.elevation.top, 'top', models, 7, 0, tz),
      ]);

      // For US resorts, fetch NWS snowfall and blend (non-blocking)
      if (resort.country === 'US') {
        try {
          const nwsDays = await fetchNWSSnowfall(resort.lat, resort.lon);
          const nwsMap = nwsToSnowMap(nwsDays);
          if (nwsMap.size > 0) {
            applyNWSBlend(base, nwsMap);
            applyNWSBlend(mid, nwsMap);
            applyNWSBlend(top, nwsMap);
          }
        } catch {
          // NWS is optional — proceed without blending
        }
      }

      setForecast({
        resort,
        fetchedAt: new Date().toISOString(),
        base,
        mid,
        top,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  }, [resort, tz]);

  useEffect(() => {
    void load();
  }, [load]);

  return { forecast, loading, error, refetch: load };
}

/* ── useHistorical ───────────────────────────────── */

interface UseHistoricalResult {
  data: HistoricalSnowDay[];
  loading: boolean;
  error: string | null;
}

export function useHistorical(
  resort: Resort | undefined,
  startDate: string,
  endDate: string,
): UseHistoricalResult {
  const [data, setData] = useState<HistoricalSnowDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tz } = useTimezone();

  useEffect(() => {
    if (!resort) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchHistorical(
      resort.lat,
      resort.lon,
      resort.elevation.mid,
      startDate,
      endDate,
      tz,
    )
      .then((days) => {
        if (!cancelled) setData(days);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load history');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resort, startDate, endDate, tz]);

  return { data, loading, error };
}
