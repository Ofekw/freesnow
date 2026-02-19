import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { HistoricalSnowDay } from '@/types';
import { cmToIn } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { BaseChart } from './BaseChart';
import {
  COLORS,
  makeTooltip,
  makeLegend,
  makeGrid,
  makeCategoryAxis,
  makeValueAxis,
  makeBarSeries,
} from './echarts-theme';

interface Props {
  days: HistoricalSnowDay[];
}

export function SnowHistoryChart({ days }: Props) {
  const { snow: snowUnit } = useUnits();
  const isImperial = snowUnit === 'in';

  const option = useMemo<EChartsOption>(() => {
    // Aggregate by month
    const byMonth = new Map<string, { snowfall: number; snowDepth: number; count: number }>();
    for (const d of days) {
      const key = d.date.slice(0, 7); // YYYY-MM
      const entry = byMonth.get(key) ?? { snowfall: 0, snowDepth: 0, count: 0 };
      entry.snowfall += d.snowfall;
      entry.snowDepth += d.snowDepth;
      entry.count += 1;
      byMonth.set(key, entry);
    }

    const months: string[] = [];
    const snowfallData: number[] = [];
    const avgDepthData: number[] = [];

    for (const [month, v] of byMonth.entries()) {
      months.push(month);
      snowfallData.push(isImperial ? +cmToIn(v.snowfall).toFixed(1) : +v.snowfall.toFixed(1));
      avgDepthData.push(isImperial ? +cmToIn(v.snowDepth / v.count).toFixed(1) : +(v.snowDepth / v.count).toFixed(1));
    }

    const precipLabel = isImperial ? 'in' : 'cm';

    return {
      tooltip: makeTooltip(),
      legend: makeLegend([`Snowfall (${precipLabel})`, `Avg Depth (${precipLabel})`], { bottom: 0 }),
      grid: makeGrid({ bottom: 48 }),
      xAxis: [makeCategoryAxis(months)],
      yAxis: [makeValueAxis({ name: precipLabel, nameLocation: 'middle', nameGap: 36 })],
      series: [
        makeBarSeries(`Snowfall (${precipLabel})`, snowfallData, COLORS.snow),
        makeBarSeries(`Avg Depth (${precipLabel})`, avgDepthData, COLORS.cumulative),
      ],
    };
  }, [days, isImperial]);

  return <BaseChart option={option} height={280} />;
}
