import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResortBySlug } from '@/data/resorts';
import { useForecast } from '@/hooks/useWeather';
import { fetchForecast } from '@/data/openmeteo';
import { useFavorites } from '@/hooks/useFavorites';
import { ElevationToggle } from '@/components/ElevationToggle';
import { DailyForecastChart } from '@/components/charts/DailyForecastChart';
import { HourlyDetailChart } from '@/components/charts/HourlyDetailChart';
import { HourlySnowChart } from '@/components/charts/HourlySnowChart';
import { RecentSnowChart } from '@/components/charts/RecentSnowChart';
import { FreezingLevelChart } from '@/components/charts/FreezingLevelChart';
import { UVIndexChart } from '@/components/charts/UVIndexChart';
import { weatherDescription, fmtTemp, fmtElevation, fmtSnow } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';
import type { ElevationBand, BandForecast, DailyMetrics } from '@/types';
import './ResortPage.css';

export function ResortPage() {
  const { slug } = useParams<{ slug: string }>();
  const resort = useMemo(() => getResortBySlug(slug ?? ''), [slug]);
  const { forecast, loading, error, refetch } = useForecast(resort);
  const { toggle: toggleFav, isFav } = useFavorites();
  const { temp, elev, snow } = useUnits();
  const { tz, fmtDate } = useTimezone();
  const [band, setBand] = useState<ElevationBand>('mid');
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // Recent 14-day snowfall via forecast endpoint's past_days (no archive lag)
  const [recentDays, setRecentDays] = useState<DailyMetrics[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    if (!resort) return;
    let cancelled = false;
    setHistLoading(true);
    fetchForecast(resort.lat, resort.lon, resort.elevation.mid, 'mid', 1, 14, tz)
      .then((result) => {
        if (!cancelled) {
          const today = new Date().toISOString().slice(0, 10);
          setRecentDays(result.daily.filter((d) => d.date < today));
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setHistLoading(false); });
    return () => { cancelled = true; };
  }, [resort, tz]);

  // Reset selected day when forecast changes
  useEffect(() => { setSelectedDayIdx(0); }, [forecast, band]);

  const bandData: BandForecast | undefined = forecast?.[band];

  // Compute hourly data for selected day
  const selectedDay = bandData?.daily[selectedDayIdx];
  const selectedDayHourly = useMemo(() => {
    if (!bandData || !selectedDay) return [];
    return bandData.hourly.filter((h) => h.time.startsWith(selectedDay.date));
  }, [bandData, selectedDay]);

  if (!resort) {
    return (
      <div className="resort-page__empty">
        <h2>Resort not found</h2>
        <Link to="/">← Back to all resorts</Link>
      </div>
    );
  }

  const selectedDayLabel = selectedDay
    ? fmtDate(selectedDay.date + 'T12:00:00', { weekday: 'long', month: 'short', day: 'numeric' })
    : '';

  // Compute 7-day total snowfall
  const weekTotalSnow = bandData
    ? bandData.daily.reduce((s, d) => s + d.snowfallSum, 0)
    : 0;

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
          {/* ─── SNOWFALL SECTION ─── */}
          <section className="resort-page__snow-section">
            <div className="resort-page__snow-section-header">
              <h2 className="section-title">
                ❄️ 7-Day Snow — {band.toUpperCase()} ({fmtElevation(bandData.elevation, elev)})
              </h2>
              {weekTotalSnow > 0 && (
                <span className="resort-page__week-total">
                  {fmtSnow(weekTotalSnow, snow)} next 7 days
                </span>
              )}
            </div>

            {/* Interactive day cards */}
            <div className="daily-cards">
              {bandData.daily.map((d, i) => {
                const desc = weatherDescription(d.weatherCode);
                const isSelected = i === selectedDayIdx;
                return (
                  <button
                    key={d.date}
                    className={`day-card ${isSelected ? 'day-card--selected' : ''}`}
                    onClick={() => setSelectedDayIdx(i)}
                    aria-pressed={isSelected}
                  >
                    <span className="day-card__date">
                      {fmtDate(d.date + 'T12:00:00', { weekday: 'short' })}
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
                  </button>
                );
              })}
            </div>

            {/* 7-day overview chart */}
            <div className="resort-page__chart-block">
              <h3 className="section-subtitle">7-Day Overview</h3>
              <DailyForecastChart daily={bandData.daily} />
            </div>

            {/* Hourly snow breakdown for selected day */}
            {selectedDayHourly.length > 0 && (
              <HourlySnowChart
                hourly={selectedDayHourly}
                dayLabel={selectedDayLabel}
              />
            )}
          </section>

          {/* ─── CONDITIONS SECTION ─── */}
          <section className="resort-page__section">
            <h2 className="section-title">📊 Detailed Conditions — {selectedDayLabel}</h2>
            <HourlyDetailChart hourly={selectedDayHourly.length > 0 ? selectedDayHourly : bandData.hourly.slice(0, 24)} />
          </section>

          <div className="resort-page__conditions-grid">
            <section className="resort-page__section resort-page__section--half">
              <h3 className="section-subtitle">UV Index</h3>
              <UVIndexChart daily={bandData.daily} />
            </section>

            <section className="resort-page__section resort-page__section--half">
              <h3 className="section-subtitle">Freezing Level</h3>
              <FreezingLevelChart hourly={selectedDayHourly.length > 0 ? selectedDayHourly : bandData.hourly.slice(0, 24)} />
            </section>
          </div>
        </>
      )}

      {/* ─── RECENT SNOWFALL ─── */}
      <section className="resort-page__section">
        <h2 className="section-title">📅 Recent Snowfall (past 14 days)</h2>
        {histLoading ? (
          <div className="resort-page__loader">Loading history…</div>
        ) : recentDays.length > 0 ? (
          <RecentSnowChart days={recentDays} />
        ) : (
          <p className="resort-page__muted">No recent data available.</p>
        )}
      </section>
    </div>
  );
}
