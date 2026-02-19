import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { DailyMetrics } from '@/types';
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

interface Props {
  daily: DailyMetrics[];
}

export function DailyForecastChart({ daily }: Props) {
  const { temp: tempUnit, snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = tempUnit === 'F';

  const option = useMemo<EChartsOption>(() => {
    const dates = daily.map((d) =>
      fmtDate(d.date + 'T12:00:00', { weekday: 'short', month: 'numeric', day: 'numeric' }),
    );
    const snowData = daily.map((d) =>
      isImperial ? +cmToIn(d.snowfallSum).toFixed(1) : +d.snowfallSum.toFixed(1),
    );
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

    return {
      tooltip: makeTooltip(),
      legend: makeLegend(
        [`Snow (${precipLabel})`, `Rain (${precipLabel})`, `High ${tempLabel}`, `Low ${tempLabel}`],
        { bottom: 0 },
      ),
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
      series: [
        makeBarSeries(`Snow (${precipLabel})`, snowData, COLORS.snow, { yAxisIndex: 0 }),
        makeBarSeries(`Rain (${precipLabel})`, rainData, COLORS.rain, {
          yAxisIndex: 0,
          itemStyle: { color: COLORS.rain, borderRadius: [3, 3, 0, 0], opacity: 0.75 },
        }),
        makeLineSeries(`High ${tempLabel}`, highData, COLORS.tempHigh, { yAxisIndex: 1 }),
        makeLineSeries(`Low ${tempLabel}`, lowData, COLORS.tempLow, { yAxisIndex: 1 }),
      ],
    };
  }, [daily, isImperial, tempUnit, snowUnit, fmtDate]);

  return <BaseChart option={option} height={340} group="resort-daily" />;
}
