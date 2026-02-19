import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { HourlyMetrics } from '@/types';
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
  hourly: HourlyMetrics[];
  /** Label shown above chart, e.g. "Monday 2/10" */
  dayLabel: string;
}

export function HourlySnowChart({ hourly, dayLabel }: Props) {
  const { snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = snowUnit === 'in';

  const totalSnow = hourly.reduce((s, h) => s + h.snowfall, 0);
  const totalDisplay = isImperial
    ? `${cmToIn(totalSnow).toFixed(1)}"`
    : `${totalSnow.toFixed(1)}cm`;
  const hasSnow = totalSnow > 0;
  const precipLabel = isImperial ? 'in' : 'cm';

  const option = useMemo<EChartsOption>(() => {
    const hours = hourly.map((h) => fmtDate(h.time, { hour: 'numeric' }));
    const snowData = hourly.map((h) =>
      isImperial ? +cmToIn(h.snowfall).toFixed(2) : +h.snowfall.toFixed(1),
    );
    const probData = hourly.map((h) => h.precipitationProbability);

    return {
      tooltip: makeTooltip({
        formatter(params: unknown) {
          const items = Array.isArray(params) ? params as Array<{ seriesName: string; value: number; axisValueLabel: string; marker: string }> : [];
          const first = items[0];
          if (!first) return '';
          let html = `<div style="font-weight:600;margin-bottom:4px">${first.axisValueLabel}</div>`;
          for (const item of items) {
            const unit = item.seriesName.includes('Snow') ? ` ${precipLabel}` : '%';
            html += `<div>${item.marker} ${item.seriesName}: <strong>${item.value}${unit}</strong></div>`;
          }
          return html;
        },
      }),
      legend: makeLegend(['Snow', 'Precip %'], { bottom: 0 }),
      grid: makeGrid({ bottom: 48, left: 40, right: 40, top: 8 }),
      xAxis: [makeCategoryAxis(hours, { axisTick: { show: false } })],
      yAxis: [
        makeValueAxis({
          min: 0,
          max: isImperial ? 1 : 2.5,
          interval: isImperial ? 0.2 : 0.5,
          axisLabel: {
            color: COLORS.textMuted,
            fontSize: 10,
            fontFamily: "'Space Mono', monospace",
          },
        }),
        makeValueAxis({
          min: 0,
          max: 100,
          interval: 25,
          position: 'right',
          splitLine: { show: false },
          axisLabel: {
            color: COLORS.textMuted,
            fontSize: 10,
            fontFamily: "'Space Mono', monospace",
            formatter: '{value}%',
          },
        }),
      ],
      series: [
        makeBarSeries('Snow', snowData, COLORS.snow, {
          yAxisIndex: 0,
          barMaxWidth: 20,
        }),
        makeLineSeries('Precip %', probData, COLORS.cumulative, {
          yAxisIndex: 1,
          lineStyle: { color: COLORS.cumulative, width: 1.5, type: 'dotted' },
          itemStyle: { color: COLORS.cumulative },
        }),
      ],
    };
  }, [hourly, isImperial, precipLabel, fmtDate]);

  return (
    <div className="hourly-snow-chart">
      <div className="hourly-snow-chart__header">
        <span className="hourly-snow-chart__label">{dayLabel}</span>
        <span className={`hourly-snow-chart__total ${hasSnow ? 'has-snow' : ''}`}>
          {hasSnow ? `❄️ ${totalDisplay}` : 'No snow expected'}
        </span>
      </div>
      <BaseChart option={option} height={200} group="resort-hourly-snow" />
    </div>
  );
}
