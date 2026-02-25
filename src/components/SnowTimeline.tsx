/**
 * SnowTimeline — At-a-glance past + future snowfall bar.
 *
 * Compact snow summary: shows past 7 days + upcoming 7 days
 * as a compact horizontal bar chart with a vertical "today" divider.
 * Future forecast days are broken into AM / PM / Overnight sub-bars for
 * more granular visibility into when snowfall is expected.
 */
import { useMemo } from 'react';
import type { DailyMetrics, HourlyMetrics } from '@/types';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';
import { fmtSnow, cmToIn } from '@/utils/weather';
import { splitDayPeriods } from './snowTimelinePeriods';
import './SnowTimeline.css';

interface Props {
  /** Past days (up to 7, chronological order oldest→newest) */
  recentDays: DailyMetrics[];
  /** Forecast days (up to 7, chronological order) */
  forecastDays: DailyMetrics[];
  /** Hourly forecast data — used to split future days into AM/PM/Overnight */
  forecastHourly?: HourlyMetrics[];
}

export function SnowTimeline({ recentDays, forecastDays, forecastHourly }: Props) {
  const { snow } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = snow === 'in';

  const { pastBars, todayBar, futureBars, maxSnow, pastTotal, futureTotal } = useMemo(() => {
    // Take last 7 past days
    const past = recentDays.slice(-7);
    // First forecast day is today; the rest are future
    const [todayDay, ...rest] = forecastDays;
    const future = rest.slice(0, 7);

    const toDisplay = (cm: number) =>
      isImperial ? +cmToIn(cm).toFixed(1) : +cm.toFixed(1);

    const pastBars = past.map((d) => ({
      date: d.date,
      snow: toDisplay(d.snowfallSum),
      raw: d.snowfallSum,
    }));

    const todayPeriods = todayDay && forecastHourly ? splitDayPeriods(todayDay.date, forecastHourly) : null;
    const todayBar = todayDay
      ? {
          date: todayDay.date,
          snow: toDisplay(todayDay.snowfallSum),
          raw: todayDay.snowfallSum,
          am: todayPeriods ? toDisplay(todayPeriods.am) : 0,
          pm: todayPeriods ? toDisplay(todayPeriods.pm) : 0,
          overnight: todayPeriods ? toDisplay(todayPeriods.overnight) : 0,
        }
      : null;

    const futureBars = future.map((d) => {
      const periods = forecastHourly ? splitDayPeriods(d.date, forecastHourly) : null;
      return {
        date: d.date,
        snow: toDisplay(d.snowfallSum),
        raw: d.snowfallSum,
        am: periods ? toDisplay(periods.am) : 0,
        pm: periods ? toDisplay(periods.pm) : 0,
        overnight: periods ? toDisplay(periods.overnight) : 0,
      };
    });

    // For the max calculation, consider individual period values so bars scale correctly
    const todayPeriodSnow = todayBar && forecastHourly ? [todayBar.am, todayBar.pm, todayBar.overnight] : (todayBar ? [todayBar.snow] : []);
    const allSnow = [
      ...pastBars.map((b) => b.snow),
      ...todayPeriodSnow,
      ...futureBars.flatMap((b) => (forecastHourly ? [b.am, b.pm, b.overnight] : [b.snow])),
    ];
    const maxSnow = Math.max(...allSnow, 0.1); // avoid 0 max

    const pastTotal = past.reduce((s, d) => s + d.snowfallSum, 0);
    const futureTotal =
      (todayDay ? todayDay.snowfallSum : 0) + future.reduce((s, d) => s + d.snowfallSum, 0);

    return { pastBars, todayBar, futureBars, maxSnow, pastTotal, futureTotal };
  }, [recentDays, forecastDays, forecastHourly, isImperial]);

  const fmtDay = (dateStr: string) =>
    fmtDate(dateStr + 'T12:00:00', { weekday: 'short' });

  const fmtFull = (dateStr: string) =>
    fmtDate(dateStr + 'T12:00:00', { weekday: 'short', month: 'short', day: 'numeric' });

  const unit = isImperial ? '"' : 'cm';

  return (
    <div className="snow-timeline" role="figure" aria-label="Snow timeline showing past and upcoming snowfall">
      {/* Header */}
      <div className="snow-timeline__header">
        <div className="snow-timeline__totals">
          <span className="snow-timeline__total snow-timeline__total--past">
            <span className="snow-timeline__total-label">Past 7d</span>
            <span className="snow-timeline__total-value">{fmtSnow(pastTotal, snow)}</span>
          </span>
          <span className="snow-timeline__total snow-timeline__total--future">
            <span className="snow-timeline__total-label">Next 7d</span>
            <span className="snow-timeline__total-value">{fmtSnow(futureTotal, snow)}</span>
          </span>
        </div>
      </div>

      {/* Bar chart area */}
      <div className="snow-timeline__chart">
        {/* Past bars */}
        <div className="snow-timeline__section snow-timeline__section--past">
          {pastBars.map((bar) => {
            const pct = (bar.snow / maxSnow) * 100;
            return (
              <div
                key={bar.date}
                className="snow-timeline__bar-col"
                title={`${fmtFull(bar.date)}: ${bar.snow}${unit}`}
              >
                <span className="snow-timeline__bar-value">
                  {bar.snow > 0 ? `${bar.snow}` : ''}
                </span>
                <div className="snow-timeline__bar-track">
                  <div
                    className="snow-timeline__bar snow-timeline__bar--past"
                    style={{ height: `${Math.max(pct, bar.snow > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="snow-timeline__bar-label">{fmtDay(bar.date)}</span>
              </div>
            );
          })}
        </div>

        {/* Today bar — split into AM / PM / Overnight when hourly data is available */}
        <div className="snow-timeline__today" aria-label="Today">
          <span className="snow-timeline__bar-value snow-timeline__bar-value--today">
            {todayBar && todayBar.snow > 0 ? `${todayBar.snow}` : ''}
          </span>
          {todayBar ? (
            forecastHourly && (todayBar.am > 0 || todayBar.pm > 0 || todayBar.overnight > 0) ? (
              <div className="snow-timeline__bar-track snow-timeline__bar-track--periods snow-timeline__bar-track--today">
                <div
                  className="snow-timeline__bar snow-timeline__bar--am"
                  style={{ height: `${Math.max((todayBar.am / maxSnow) * 100, todayBar.am > 0 ? 4 : 0)}%` }}
                  title={`Morning snow: ${todayBar.am}${unit}`}
                />
                <div
                  className="snow-timeline__bar snow-timeline__bar--pm"
                  style={{ height: `${Math.max((todayBar.pm / maxSnow) * 100, todayBar.pm > 0 ? 4 : 0)}%` }}
                  title={`Afternoon snow: ${todayBar.pm}${unit}`}
                />
                <div
                  className="snow-timeline__bar snow-timeline__bar--overnight"
                  style={{ height: `${Math.max((todayBar.overnight / maxSnow) * 100, todayBar.overnight > 0 ? 4 : 0)}%` }}
                  title={`Overnight snow: ${todayBar.overnight}${unit}`}
                />
              </div>
            ) : (
              <div className="snow-timeline__bar-track">
                <div
                  className="snow-timeline__bar snow-timeline__bar--today"
                  style={{
                    height: `${Math.max((todayBar.snow / maxSnow) * 100, todayBar.snow > 0 ? 4 : 0)}%`,
                  }}
                />
              </div>
            )
          ) : (
            <div className="snow-timeline__bar-track">
              <div className="snow-timeline__divider-line" />
            </div>
          )}
          <span className="snow-timeline__divider-label">Today</span>
        </div>

        {/* Future bars — split into AM / PM / Overnight sub-bars */}
        <div className="snow-timeline__section snow-timeline__section--future">
          {futureBars.map((bar) => {
            const hasPeriods = forecastHourly && (bar.am > 0 || bar.pm > 0 || bar.overnight > 0);
            return (
              <div
                key={bar.date}
                className="snow-timeline__bar-col"
                title={`${fmtFull(bar.date)}: ${bar.snow}${unit}`}
              >
                <span className="snow-timeline__bar-value">
                  {bar.snow > 0 ? `${bar.snow}` : ''}
                </span>
                {hasPeriods ? (
                  <div className="snow-timeline__bar-track snow-timeline__bar-track--periods">
                    <div
                      className="snow-timeline__bar snow-timeline__bar--am"
                      style={{ height: `${Math.max((bar.am / maxSnow) * 100, bar.am > 0 ? 4 : 0)}%` }}
                      title={`Morning snow: ${bar.am}${unit}`}
                    />
                    <div
                      className="snow-timeline__bar snow-timeline__bar--pm"
                      style={{ height: `${Math.max((bar.pm / maxSnow) * 100, bar.pm > 0 ? 4 : 0)}%` }}
                      title={`Afternoon snow: ${bar.pm}${unit}`}
                    />
                    <div
                      className="snow-timeline__bar snow-timeline__bar--overnight"
                      style={{ height: `${Math.max((bar.overnight / maxSnow) * 100, bar.overnight > 0 ? 4 : 0)}%` }}
                      title={`Overnight snow: ${bar.overnight}${unit}`}
                    />
                  </div>
                ) : (
                  <div className="snow-timeline__bar-track">
                    <div
                      className="snow-timeline__bar snow-timeline__bar--future"
                      style={{ height: `${Math.max((bar.snow / maxSnow) * 100, bar.snow > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                )}
                <span className="snow-timeline__bar-label">{fmtDay(bar.date)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="snow-timeline__legend" aria-label="Legend">
        <span className="snow-timeline__legend-item" title="AM — 6 am to 12 pm">
          <span className="snow-timeline__legend-swatch snow-timeline__legend-swatch--am" />
          AM
        </span>
        <span className="snow-timeline__legend-item" title="PM — 12 pm to 6 pm">
          <span className="snow-timeline__legend-swatch snow-timeline__legend-swatch--pm" />
          PM
        </span>
        <span className="snow-timeline__legend-item" title="Night — 6 pm to 6 am">
          <span className="snow-timeline__legend-swatch snow-timeline__legend-swatch--overnight" />
          Night
        </span>
      </div>
    </div>
  );
}
