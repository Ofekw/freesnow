/**
 * MiniSnowTimeline — Compact 5-day snow bar for favorite cards.
 *
 * Shows yesterday + today + next 3 days as a compact horizontal bar chart.
 * Today is highlighted. Future days show AM / PM / Overnight sub-bars
 * when hourly data is available.
 */
import { useMemo } from 'react';
import type { DailyMetrics, HourlyMetrics } from '@/types';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';
import { cmToIn } from '@/utils/weather';
import { splitDayPeriods } from './snowTimelinePeriods';
import './MiniSnowTimeline.css';

interface Props {
  /** All past days (chronological oldest→newest). Last element = yesterday. */
  pastDays: DailyMetrics[];
  /** Today + future days (chronological). First = today. */
  forecastDays: DailyMetrics[];
  /** Hourly forecast data — used to split future days into AM/PM/Overnight */
  forecastHourly?: HourlyMetrics[];
}

export function MiniSnowTimeline({ pastDays, forecastDays, forecastHourly }: Props) {
  const { snow } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = snow === 'in';

  const { yesterdayBar, todayBar, futureBars, maxSnow } = useMemo(() => {
    const toDisplay = (cm: number) =>
      isImperial ? +cmToIn(cm).toFixed(1) : +cm.toFixed(1);

    // Yesterday = last past day
    const yesterday = pastDays.length > 0 ? pastDays[pastDays.length - 1] : null;
    const yesterdayBar = yesterday
      ? { date: yesterday.date, snow: toDisplay(yesterday.snowfallSum) }
      : null;

    // Today = first forecast day
    const [todayDay, ...rest] = forecastDays;
    const future = rest.slice(0, 3); // next 3 days

    const todayPeriods = todayDay && forecastHourly
      ? splitDayPeriods(todayDay.date, forecastHourly)
      : null;

    const todayBar = todayDay
      ? {
          date: todayDay.date,
          snow: toDisplay(todayDay.snowfallSum),
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
        am: periods ? toDisplay(periods.am) : 0,
        pm: periods ? toDisplay(periods.pm) : 0,
        overnight: periods ? toDisplay(periods.overnight) : 0,
      };
    });

    // Compute max for scaling
    const todayPeriodSnow = todayBar && forecastHourly
      ? [todayBar.am, todayBar.pm, todayBar.overnight]
      : (todayBar ? [todayBar.snow] : []);
    const allSnow = [
      ...(yesterdayBar ? [yesterdayBar.snow] : []),
      ...todayPeriodSnow,
      ...futureBars.flatMap((b) =>
        forecastHourly ? [b.am, b.pm, b.overnight] : [b.snow],
      ),
    ];
    const maxSnow = Math.max(...allSnow, 0.1);

    return { yesterdayBar, todayBar, futureBars, maxSnow };
  }, [pastDays, forecastDays, forecastHourly, isImperial]);

  const fmtDay = (dateStr: string) =>
    fmtDate(dateStr + 'T12:00:00', { weekday: 'short' });

  const unit = isImperial ? '"' : 'cm';

  /** Render a future-style bar (with optional AM/PM/Overnight sub-bars) */
  const renderFutureBar = (bar: {
    date: string;
    snow: number;
    am: number;
    pm: number;
    overnight: number;
  }) => {
    const hasPeriods = forecastHourly && (bar.am > 0 || bar.pm > 0 || bar.overnight > 0);
    return (
      <div
        key={bar.date}
        className="mini-timeline__col"
        title={`${fmtDay(bar.date)}: ${bar.snow}${unit}`}
      >
        <span className="mini-timeline__value">
          {bar.snow > 0 ? bar.snow : ''}
        </span>
        {hasPeriods ? (
          <div className="mini-timeline__track mini-timeline__track--periods">
            <div
              className="mini-timeline__bar mini-timeline__bar--am"
              style={{ height: `${Math.max((bar.am / maxSnow) * 100, bar.am > 0 ? 4 : 0)}%` }}
            />
            <div
              className="mini-timeline__bar mini-timeline__bar--pm"
              style={{ height: `${Math.max((bar.pm / maxSnow) * 100, bar.pm > 0 ? 4 : 0)}%` }}
            />
            <div
              className="mini-timeline__bar mini-timeline__bar--overnight"
              style={{ height: `${Math.max((bar.overnight / maxSnow) * 100, bar.overnight > 0 ? 4 : 0)}%` }}
            />
          </div>
        ) : (
          <div className="mini-timeline__track">
            <div
              className="mini-timeline__bar mini-timeline__bar--future"
              style={{ height: `${Math.max((bar.snow / maxSnow) * 100, bar.snow > 0 ? 4 : 0)}%` }}
            />
          </div>
        )}
        <span className="mini-timeline__label">{fmtDay(bar.date)}</span>
      </div>
    );
  };

  return (
    <div className="mini-timeline" role="figure" aria-label="5-day snow timeline">
      {/* Yesterday */}
      {yesterdayBar && (
        <div
          className="mini-timeline__col"
          title={`${fmtDay(yesterdayBar.date)}: ${yesterdayBar.snow}${unit}`}
        >
          <span className="mini-timeline__value">
            {yesterdayBar.snow > 0 ? yesterdayBar.snow : ''}
          </span>
          <div className="mini-timeline__track">
            <div
              className="mini-timeline__bar mini-timeline__bar--past"
              style={{ height: `${Math.max((yesterdayBar.snow / maxSnow) * 100, yesterdayBar.snow > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="mini-timeline__label">{fmtDay(yesterdayBar.date)}</span>
        </div>
      )}

      {/* Today */}
      {todayBar && (
        <div
          className="mini-timeline__col mini-timeline__col--today"
          title={`Today: ${todayBar.snow}${unit}`}
        >
          <span className="mini-timeline__value mini-timeline__value--today">
            {todayBar.snow > 0 ? todayBar.snow : ''}
          </span>
          {forecastHourly && (todayBar.am > 0 || todayBar.pm > 0 || todayBar.overnight > 0) ? (
            <div className="mini-timeline__track mini-timeline__track--periods mini-timeline__track--today-border">
              <div
                className="mini-timeline__bar mini-timeline__bar--am"
                style={{ height: `${Math.max((todayBar.am / maxSnow) * 100, todayBar.am > 0 ? 4 : 0)}%` }}
              />
              <div
                className="mini-timeline__bar mini-timeline__bar--pm"
                style={{ height: `${Math.max((todayBar.pm / maxSnow) * 100, todayBar.pm > 0 ? 4 : 0)}%` }}
              />
              <div
                className="mini-timeline__bar mini-timeline__bar--overnight"
                style={{ height: `${Math.max((todayBar.overnight / maxSnow) * 100, todayBar.overnight > 0 ? 4 : 0)}%` }}
              />
            </div>
          ) : (
            <div className="mini-timeline__track">
              <div
                className="mini-timeline__bar mini-timeline__bar--today"
                style={{ height: `${Math.max((todayBar.snow / maxSnow) * 100, todayBar.snow > 0 ? 4 : 0)}%` }}
              />
            </div>
          )}
          <span className="mini-timeline__label mini-timeline__label--today">Today</span>
        </div>
      )}

      {/* Next 3 days */}
      {futureBars.map(renderFutureBar)}
    </div>
  );
}
