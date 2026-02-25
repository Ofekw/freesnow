import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { DailyMetrics, HourlyMetrics } from '@/types';
import { cmToIn } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';
import { BaseChart } from './BaseChart';
import {
  COLORS,
  makeTooltip,
  makeLegend,
  makeGrid,
  makeCategoryAxis,
  makeValueAxis,
  makeBarSeries,
  makeLineSeries,
} from './echarts-theme';

/** Snowfall breakdown for a single period of the day */
interface PeriodSnow {
  am: number;        // 6 AM – 11:59 AM
  pm: number;        // 12 PM – 5:59 PM
  overnight: number; // 6 PM – 5:59 AM (18-23 + 0-5)
}

/**
 * Sum hourly snowfall for a given date into AM / PM / Overnight buckets.
 * AM = hours 6-11, PM = hours 12-17, Overnight = hours 0-5 + 18-23.
 */
function splitDayPeriods(date: string, hourly: HourlyMetrics[]): PeriodSnow {
  const dayHours = hourly.filter((h) => h.time.startsWith(date));
  let am = 0;
  let pm = 0;
  let overnight = 0;
  for (const h of dayHours) {
    const hour = new Date(h.time).getHours();
    if (hour >= 6 && hour < 12) am += h.snowfall;
    else if (hour >= 12 && hour < 18) pm += h.snowfall;
    else overnight += h.snowfall; // 0-5 or 18-23
  }
  return { am, pm, overnight };
}

interface Props {
  daily: DailyMetrics[];
  /** Optional hourly data — when provided, snow bars are split into AM/PM/Overnight periods */
  hourly?: HourlyMetrics[];
}

export function DailyForecastChart({ daily, hourly }: Props) {
  const { temp: tempUnit, snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = tempUnit === 'F';

  const option = useMemo<EChartsOption>(() => {
    const dates = daily.map((d) =>
      fmtDate(d.date + 'T12:00:00', { weekday: 'short', month: 'numeric', day: 'numeric' }),
    );

    const toDisplay = (cm: number) =>
      isImperial ? +cmToIn(cm).toFixed(1) : +cm.toFixed(1);

    // When hourly data is available, split each day into AM/PM/Overnight periods
    const hasPeriods = !!hourly;
    let amData: number[] = [];
    let pmData: number[] = [];
    let overnightData: number[] = [];
    let snowData: number[] = [];

    if (hasPeriods) {
      amData = daily.map((d) => {
        const periods = splitDayPeriods(d.date, hourly);
        return toDisplay(periods.am);
      });
      pmData = daily.map((d) => {
        const periods = splitDayPeriods(d.date, hourly);
        return toDisplay(periods.pm);
      });
      overnightData = daily.map((d) => {
        const periods = splitDayPeriods(d.date, hourly);
        return toDisplay(periods.overnight);
      });
    } else {
      snowData = daily.map((d) => toDisplay(d.snowfallSum));
    }

    const rainData = daily.map((d) =>
      isImperial ? +(d.rainSum / 25.4).toFixed(2) : +(d.rainSum / 10).toFixed(2),
    );
    const highData = daily.map((d) =>
      isImperial ? Math.round(d.temperatureMax * 9 / 5 + 32) : Math.round(d.temperatureMax),
    );
    const lowData = daily.map((d) =>
      isImperial ? Math.round(d.temperatureMin * 9 / 5 + 32) : Math.round(d.temperatureMin),
    );

    const precipLabel = isImperial ? 'in' : snowUnit;
    const tempLabel = `°${tempUnit}`;

    // Build legend items based on whether we have periods or not
    const legendItems = hasPeriods
      ? [`Morning (${precipLabel})`, `Afternoon (${precipLabel})`, `Overnight (${precipLabel})`, `Rain (${precipLabel})`, `High ${tempLabel}`, `Low ${tempLabel}`]
      : [`Snow (${precipLabel})`, `Rain (${precipLabel})`, `High ${tempLabel}`, `Low ${tempLabel}`];

    // Build series array
    const series: Record<string, unknown>[] = [];
    
    if (hasPeriods) {
      // Add period-specific snow bars with colors matching SnowTimeline
      series.push(
        makeBarSeries(`Morning (${precipLabel})`, amData, '#fbbf24', {
          yAxisIndex: 0,
          stack: 'snow',
          itemStyle: {
            color: 'rgba(251, 191, 36, 0.85)',
            borderRadius: [0, 0, 0, 0],
          },
        }),
        makeBarSeries(`Afternoon (${precipLabel})`, pmData, '#38bdf8', {
          yAxisIndex: 0,
          stack: 'snow',
          itemStyle: {
            color: 'rgba(56, 189, 248, 0.85)',
            borderRadius: [0, 0, 0, 0],
          },
        }),
        makeBarSeries(`Overnight (${precipLabel})`, overnightData, '#8b5cf6', {
          yAxisIndex: 0,
          stack: 'snow',
          itemStyle: {
            color: 'rgba(139, 92, 246, 0.85)',
            borderRadius: [3, 3, 0, 0],
          },
        }),
      );
    } else {
      series.push(
        makeBarSeries(`Snow (${precipLabel})`, snowData, COLORS.snow, { yAxisIndex: 0 }),
      );
    }

    series.push(
      makeBarSeries(`Rain (${precipLabel})`, rainData, COLORS.rain, {
        yAxisIndex: 0,
        itemStyle: { color: COLORS.rain, borderRadius: [3, 3, 0, 0], opacity: 0.75 },
      }),
      makeLineSeries(`High ${tempLabel}`, highData, COLORS.tempHigh, { yAxisIndex: 1 }),
      makeLineSeries(`Low ${tempLabel}`, lowData, COLORS.tempLow, { yAxisIndex: 1 }),
    );

    return {
      tooltip: makeTooltip(),
      legend: makeLegend(legendItems, { bottom: 0 }),
      grid: makeGrid({ bottom: 48, right: 56 }),
      xAxis: [makeCategoryAxis(dates)],
      yAxis: [
        makeValueAxis({
          name: precipLabel,
          nameLocation: 'middle',
          nameGap: 36,
          min: 0,
          max: isImperial ? 12 : 30,
          interval: isImperial ? 2 : 5,
        }),
        makeValueAxis({
          name: tempLabel,
          nameLocation: 'middle',
          nameGap: 36,
          position: 'right',
          splitLine: { show: false },
        }),
      ],
      series,
    };
  }, [daily, hourly, isImperial, tempUnit, snowUnit, fmtDate]);

  return <BaseChart option={option} height={340} group="resort-daily" />;
}
