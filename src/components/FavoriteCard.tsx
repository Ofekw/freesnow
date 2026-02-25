import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { WeatherIcon } from '@/components/icons';
import type { Resort, DailyMetrics, HourlyMetrics } from '@/types';
import { fetchMultiModelForecast } from '@/data/openmeteo';
import { fetchNWSSnowfall, nwsToSnowMap } from '@/data/nws';
import { modelsForCountry, blendWithNWS } from '@/utils/modelAverage';
import { weatherDescription, fmtTemp, fmtSnow, fmtElevation } from '@/utils/weather';
import { todayIsoInTimezone } from '@/utils/dateKey';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';
import { MiniSnowTimeline } from '@/components/MiniSnowTimeline';
import './FavoriteCard.css';

interface Props {
  resort: Resort;
  onToggleFavorite: () => void;
}

interface SummaryData {
  past7Snow: number;       // cm
  next24Snow: number;      // cm
  next7Snow: number;       // cm
  tomorrow: DailyMetrics | null;
  /** Past days for the mini timeline (chronological, oldest → newest) */
  timelinePast: DailyMetrics[];
  /** Today + future days for the mini timeline (chronological) */
  timelineForecast: DailyMetrics[];
  /** Hourly forecast data for AM/PM/Overnight splits */
  timelineHourly: HourlyMetrics[];
}

export function FavoriteCard({ resort, onToggleFavorite }: Props) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { temp, snow, elev } = useUnits();
  const { tz } = useTimezone();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Match ResortPage algorithm: country-aware multi-model forecast.
        const models = modelsForCountry(resort.country);
        const forecastData = await fetchMultiModelForecast(
          resort.lat,
          resort.lon,
          resort.elevation.mid,
          'mid',
          models,
          16,
          14,
          tz,
        );

        // US resorts: apply the same optional NWS blend used by useForecast.
        if (resort.country === 'US') {
          try {
            const nwsDays = await fetchNWSSnowfall(resort.lat, resort.lon);
            const nwsMap = nwsToSnowMap(nwsDays);
            if (nwsMap.size > 0) {
              const blended = blendWithNWS(forecastData.daily, nwsMap);
              for (const day of forecastData.daily) {
                const blendedValue = blended.get(day.date);
                if (blendedValue !== undefined) {
                  day.snowfallSum = blendedValue;
                }
              }
            }
          } catch {
            // NWS is optional — continue with model-only data.
          }
        }

        if (cancelled) return;

        const dailyDays = forecastData.daily;
        const today = todayIsoInTimezone(tz);

        // Split into past and future days (ISO date strings can be compared lexicographically)
        const pastDays = dailyDays.filter((d) => d.date < today);
        const futureDays = dailyDays.filter((d) => d.date >= today);

        // Summary windows aligned with timeline: past 7d + next 24h + next 7d
        const past7Snow = pastDays
          .slice(-7)
          .reduce((sum: number, d: DailyMetrics) => sum + d.snowfallSum, 0);
        const next24Snow = futureDays[0]?.snowfallSum ?? 0;

        // Calculate next 7 days from future days (including today)
        const next7Snow = futureDays
          .slice(0, 7)
          .reduce((sum: number, d: DailyMetrics) => sum + d.snowfallSum, 0);

        // Tomorrow: second element in futureDays (first is today)
        const tomorrow = futureDays[1] ?? null;

        // Timeline data: past 7 days + today (next 24h) + next 7 days
        const timelinePast = pastDays.slice(-7);
        const timelineForecast = futureDays.slice(0, 8);
        const timelineHourly = forecastData.hourly;

        setSummary({ past7Snow, next24Snow, next7Snow, tomorrow, timelinePast, timelineForecast, timelineHourly });
      } catch {
        // Silently fail — card still shows static info
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [resort, tz]);

  const tomorrowDesc = summary?.tomorrow
    ? weatherDescription(summary.tomorrow.weatherCode)
    : null;

  const navigate = useNavigate();

  function handleCardClick(e: React.MouseEvent) {
    // Don't navigate if the star button was clicked
    if ((e.target as HTMLElement).closest('.fav-card__fav')) return;
    navigate(`/resort/${resort.slug}`);
  }

  return (
    <div className="fav-card" onClick={handleCardClick} role="link" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/resort/${resort.slug}`); }}>
      <div className="fav-card__header">
        <span className="fav-card__name">{resort.name}</span>
        <button
          className="fav-card__fav active"
          onClick={onToggleFavorite}
          aria-label="Remove from favorites"
          title="Remove from favorites"
        >
          <Star size={18} fill="currentColor" />
        </button>
      </div>

      <p className="fav-card__region">
        {resort.region}, {resort.country}
        <span className="fav-card__elev">
          {fmtElevation(resort.elevation.base, elev)} – {fmtElevation(resort.elevation.top, elev)}
        </span>
      </p>

      {loading ? (
        <div className="fav-card__skeleton">
          <div className="skeleton skeleton--text" style={{ width: '80%' }} />
          <div className="skeleton skeleton--text" style={{ width: '60%', marginTop: '6px' }} />
          <div className="fav-card__skeleton-grid">
            <div className="skeleton skeleton--card" style={{ height: '48px' }} />
            <div className="skeleton skeleton--card" style={{ height: '48px' }} />
            <div className="skeleton skeleton--card" style={{ height: '48px' }} />
          </div>
        </div>
      ) : summary ? (
        <>
          {/* Tomorrow row */}
          {summary.tomorrow && tomorrowDesc && (
            <div className="fav-card__tomorrow">
              <span className="fav-card__tomorrow-label">Tomorrow</span>
              <span className="fav-card__tomorrow-weather">
                <WeatherIcon name={tomorrowDesc.icon} size={16} /> {tomorrowDesc.label}
              </span>
              <span className="fav-card__tomorrow-temps">
                {fmtTemp(summary.tomorrow.temperatureMin, temp)} / {fmtTemp(summary.tomorrow.temperatureMax, temp)}
              </span>
            </div>
          )}

          {/* Snow summary grid */}
          <div className="fav-card__snow-grid">
            <div className="fav-card__snow-stat">
              <span className="fav-card__snow-label">Past 7 Days</span>
              <span className="fav-card__snow-value">{fmtSnow(summary.past7Snow, snow)}</span>
            </div>
            <div className="fav-card__snow-stat">
              <span className="fav-card__snow-label">Next 24h</span>
              <span className="fav-card__snow-value">{fmtSnow(summary.next24Snow, snow)}</span>
            </div>
            <div className="fav-card__snow-stat">
              <span className="fav-card__snow-label">Next 7 Days</span>
              <span className="fav-card__snow-value">{fmtSnow(summary.next7Snow, snow)}</span>
            </div>
          </div>

          {/* Mini snow timeline: past 7d + next 24h + next 7d */}
          {summary.timelineForecast.length > 0 && (
            <MiniSnowTimeline
              pastDays={summary.timelinePast}
              forecastDays={summary.timelineForecast}
              forecastHourly={summary.timelineHourly}
            />
          )}
        </>
      ) : (
        <div className="fav-card__loading">Forecast unavailable</div>
      )}

    </div>
  );
}
