import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResortBySlug } from '@/data/resorts';
import { useForecast } from '@/hooks/useWeather';
import { fetchForecast } from '@/data/openmeteo';
import { useFavorites } from '@/hooks/useFavorites';
import { ElevationToggle } from '@/components/ElevationToggle';
import { DailyForecastChart } from '@/components/charts/DailyForecastChart';
import { HourlyDetailChart } from '@/components/charts/HourlyDetailChart';
import { FreezingLevelChart } from '@/components/charts/FreezingLevelChart';
import { UVIndexChart } from '@/components/charts/UVIndexChart';
import { weatherDescription, fmtTemp, fmtElevation, fmtSnow } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { format } from 'date-fns';
import type { ElevationBand, BandForecast, DailyMetrics } from '@/types';
import './ResortPage.css';

export function ResortPage() {
  const { slug } = useParams<{ slug: string }>();
  const resort = useMemo(() => getResortBySlug(slug ?? ''), [slug]);
  const { forecast, loading, error, refetch } = useForecast(resort);
  const { toggle: toggleFav, isFav } = useFavorites();
  const { temp, elev, snow } = useUnits();
  const [band, setBand] = useState<ElevationBand>('mid');

  // Recent 14-day snowfall via forecast endpoint's past_days (no archive lag)
  const [recentDays, setRecentDays] = useState<DailyMetrics[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    if (!resort) return;
    let cancelled = false;
    setHistLoading(true);
    fetchForecast(resort.lat, resort.lon, resort.elevation.mid, 'mid', 1, 14)
      .then((result) => {
        if (!cancelled) {
          // past_days data comes first; exclude today and future
          const today = new Date().toISOString().slice(0, 10);
          setRecentDays(result.daily.filter((d) => d.date < today));
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setHistLoading(false); });
    return () => { cancelled = true; };
  }, [resort]);

  if (!resort) {
    return (
      <div className="resort-page__empty">
        <h2>Resort not found</h2>
        <Link to="/">← Back to all resorts</Link>
      </div>
    );
  }

  const bandData: BandForecast | undefined = forecast?.[band];

  return (
    <div className="resort-page">
      {/* Header */}
      <header className="resort-page__header">
        <div>
          <Link to="/" className="resort-page__back">← All Resorts</Link>
          <h1 className="resort-page__name">{resort.name}</h1>
          <p className="resort-page__region">
            {resort.region}, {resort.country}
            {resort.website && (
              <>
                {' · '}
                <a href={resort.website} target="_blank" rel="noopener noreferrer">
                  Website ↗
                </a>
              </>
            )}
          </p>
        </div>
        <button
          className={`resort-page__fav ${isFav(resort.slug) ? 'active' : ''}`}
          onClick={() => toggleFav(resort.slug)}
          aria-label={isFav(resort.slug) ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFav(resort.slug) ? '★' : '☆'}
        </button>
      </header>

      {/* Quick stats */}
      <section className="resort-page__stats">
        <div className="stat">
          <span className="stat__label">Base</span>
          <span className="stat__value">{fmtElevation(resort.elevation.base, elev)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Mid</span>
          <span className="stat__value">{fmtElevation(resort.elevation.mid, elev)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Top</span>
          <span className="stat__value">{fmtElevation(resort.elevation.top, elev)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Vertical</span>
          <span className="stat__value">{fmtElevation(resort.verticalDrop, elev)}</span>
        </div>
        {resort.lifts && (
          <div className="stat">
            <span className="stat__label">Lifts</span>
            <span className="stat__value">{resort.lifts}</span>
          </div>
        )}
        {resort.acres && (
          <div className="stat">
            <span className="stat__label">Acres</span>
            <span className="stat__value">{resort.acres.toLocaleString()}</span>
          </div>
        )}
      </section>

      {/* Band toggle */}
      <div className="resort-page__toggle-row">
        <ElevationToggle
          value={band}
          onChange={setBand}
          elevations={resort.elevation}
        />
        <button className="resort-page__refresh" onClick={refetch} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {error && <p className="resort-page__error">⚠️ {error}</p>}

      {loading && !forecast && (
        <div className="resort-page__loader">Loading forecast…</div>
      )}

      {bandData && (
        <>
          {/* Daily summary row */}
          <section className="resort-page__daily-summary">
            <h2 className="section-title">7-Day Forecast — {band.toUpperCase()} ({fmtElevation(bandData.elevation, elev)})</h2>
            <div className="daily-cards">
              {bandData.daily.map((d) => {
                const desc = weatherDescription(d.weatherCode);
                return (
                  <div key={d.date} className="day-card">
                    <span className="day-card__date">
                      {format(new Date(d.date), 'EEE')}
                    </span>
                    <span className="day-card__icon" title={desc.label}>
                      {desc.icon}
                    </span>
                    <span className="day-card__temps">
                      {fmtTemp(d.temperatureMax, temp)} / {fmtTemp(d.temperatureMin, temp)}
                    </span>
                    <span className="day-card__snow">
                      {d.snowfallSum > 0 ? `❄️ ${fmtSnow(d.snowfallSum, snow)}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Charts */}
          <section className="resort-page__section">
            <h2 className="section-title">Snow &amp; Rain / Temperature</h2>
            <DailyForecastChart daily={bandData.daily} />
          </section>

          <section className="resort-page__section">
            <h2 className="section-title">Hourly Detail (next 7 days)</h2>
            <HourlyDetailChart hourly={bandData.hourly.slice(0, 72)} />
          </section>

          <section className="resort-page__section">
            <h2 className="section-title">UV Index</h2>
            <UVIndexChart daily={bandData.daily} />
          </section>

          <section className="resort-page__section">
            <h2 className="section-title">Freezing Level</h2>
            <FreezingLevelChart hourly={bandData.hourly.slice(0, 72)} />
          </section>
        </>
      )}

      {/* Recent Snowfall */}
      <section className="resort-page__section">
        <h2 className="section-title">Recent Snowfall (past 14 days)</h2>
        {histLoading ? (
          <div className="resort-page__loader">Loading history…</div>
        ) : recentDays.length > 0 ? (
          <RecentSnowTable days={recentDays} />
        ) : (
          <p className="resort-page__muted">No recent data available.</p>
        )}
      </section>
    </div>
  );
}

function RecentSnowTable({ days }: { days: DailyMetrics[] }) {
  const { temp, snow: snowUnit } = useUnits();
  const totalSnow = days.reduce((s, d) => s + d.snowfallSum, 0);
  return (
    <div className="recent-snow">
      <p className="recent-snow__total">
        Total: <strong>{fmtSnow(totalSnow, snowUnit)}</strong> over {days.length} days
      </p>
      <div className="recent-snow__bars">
        {days.map((d) => {
          const desc = weatherDescription(d.weatherCode);
          const snow = d.snowfallSum;
          const maxSnow = Math.max(...days.map((x) => x.snowfallSum), 1);
          const pct = (snow / maxSnow) * 100;
          return (
            <div key={d.date} className="recent-snow__row">
              <span className="recent-snow__date">{d.date.slice(5)}</span>
              <span className="recent-snow__icon" title={desc.label}>{desc.icon}</span>
              <div className="recent-snow__bar-track">
                <div
                  className="recent-snow__bar-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="recent-snow__amount">
                {snow > 0 ? fmtSnow(snow, snowUnit) : '—'}
              </span>
              <span className="recent-snow__temps">
                {fmtTemp(d.temperatureMin, temp)} / {fmtTemp(d.temperatureMax, temp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
