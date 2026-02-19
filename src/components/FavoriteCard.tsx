import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Resort, DailyMetrics } from '@/types';
import { fetchForecast } from '@/data/openmeteo';
import { weatherDescription, fmtTemp, fmtSnow, fmtElevation } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';
import './FavoriteCard.css';

interface Props {
  resort: Resort;
  onToggleFavorite: () => void;
}

interface SummaryData {
  last14Snow: number;      // cm
  next7Snow: number;       // cm
  next14Snow: number;      // cm
  tomorrow: DailyMetrics | null;
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
        // Fetch forecast with 14 past days (avoids archive API lag)
        // and 16 future days (for 14-day forecast plus buffer)
        const forecastData = await fetchForecast(
          resort.lat, resort.lon, resort.elevation.mid, 'mid', 16, 14, tz,
        ).catch(() => null);

        if (cancelled) return;

        const dailyDays = forecastData?.daily ?? [];
        const today = new Date().toISOString().slice(0, 10);

        // Split into past and future days (ISO date strings can be compared lexicographically)
        const pastDays = dailyDays.filter((d) => d.date < today);
        const futureDays = dailyDays.filter((d) => d.date >= today);

        // Calculate last 14 days snowfall (take only the most recent 14 days)
        const last14Snow = pastDays
          .slice(-14)
          .reduce((sum: number, d: DailyMetrics) => sum + d.snowfallSum, 0);

        // Calculate next 7 and 14 days from future days
        const next7Snow = futureDays
          .slice(0, 7)
          .reduce((sum: number, d: DailyMetrics) => sum + d.snowfallSum, 0);
        const next14Snow = futureDays
          .slice(0, 14)
          .reduce((sum: number, d: DailyMetrics) => sum + d.snowfallSum, 0);

        // Tomorrow: second element in futureDays (first is today)
        const tomorrow = futureDays[1] ?? null;

        setSummary({ last14Snow, next7Snow, next14Snow, tomorrow });
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
          ★
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
                {tomorrowDesc.icon} {tomorrowDesc.label}
              </span>
              <span className="fav-card__tomorrow-temps">
                {fmtTemp(summary.tomorrow.temperatureMin, temp)} / {fmtTemp(summary.tomorrow.temperatureMax, temp)}
              </span>
            </div>
          )}

          {/* Snow summary grid */}
          <div className="fav-card__snow-grid">
            <div className="fav-card__snow-stat">
              <span className="fav-card__snow-label">Last 14 Days</span>
              <span className="fav-card__snow-value">{fmtSnow(summary.last14Snow, snow)}</span>
            </div>
            <div className="fav-card__snow-stat">
              <span className="fav-card__snow-label">Next 7 Days</span>
              <span className="fav-card__snow-value">{fmtSnow(summary.next7Snow, snow)}</span>
            </div>
            <div className="fav-card__snow-stat">
              <span className="fav-card__snow-label">Next 14 Days</span>
              <span className="fav-card__snow-value">{fmtSnow(summary.next14Snow, snow)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="fav-card__loading">Forecast unavailable</div>
      )}

    </div>
  );
}
