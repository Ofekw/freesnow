import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { HourlyMetrics } from '@/types';
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
} from './echarts-theme';

interface Props {
  hourly: HourlyMetrics[];
  /** Optional resort elevation to show as reference line (meters) */
  resortElevation?: number;
}

export function FreezingLevelChart({ hourly, resortElevation }: Props) {
  const { elev } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = elev === 'ft';

  const option = useMemo<EChartsOption>(() => {
    const times = hourly.map((h) =>
      fmtDate(h.time, { weekday: 'short', hour: 'numeric' }),
    );
    const freezeData = hourly.map((h) =>
      isImperial
        ? Math.round(h.freezingLevelHeight * 3.28084)
        : Math.round(h.freezingLevelHeight),
    );

    const legendItems = ['Freezing Level'];
    const series: Record<string, unknown>[] = [
      {
        name: 'Freezing Level',
        type: 'line',
        data: freezeData,
        itemStyle: { color: COLORS.freezing },
        lineStyle: { color: COLORS.freezing, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34, 211, 238, 0.25)' },
              { offset: 1, color: 'rgba(34, 211, 238, 0.02)' },
            ],
          },
        },
        symbol: 'none',
        smooth: true,
      },
    ];

    // Resort elevation reference line
    const markLine: Record<string, unknown> | undefined = resortElevation
      ? {
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: COLORS.tempHigh, type: 'dashed', width: 1.5 },
            label: {
              formatter: `Resort ${isImperial ? Math.round(resortElevation * 3.28084).toLocaleString() : resortElevation.toLocaleString()} ${elev}`,
              color: COLORS.tempHigh,
              fontSize: 10,
              fontFamily: "'Space Mono', monospace",
            },
            data: [
              { yAxis: isImperial ? Math.round(resortElevation * 3.28084) : resortElevation },
            ],
          },
        }
      : undefined;

    if (markLine) {
      series[0] = { ...series[0], ...markLine };
    }

    return {
      tooltip: makeTooltip({
        formatter(params: unknown) {
          const items = Array.isArray(params) ? params as Array<{ value: number; axisValueLabel: string; marker: string; seriesName: string }> : [];
          const first = items[0];
          if (!first) return '';
          let html = `<div style="font-weight:600;margin-bottom:4px">${first.axisValueLabel}</div>`;
          for (const item of items) {
            html += `<div>${item.marker} ${item.seriesName}: <strong>${item.value.toLocaleString()} ${elev}</strong></div>`;
          }
          return html;
        },
      }),
      legend: makeLegend(legendItems, { bottom: 0 }),
      grid: makeGrid({ bottom: 44, left: 56 }),
      xAxis: [makeCategoryAxis(times)],
      yAxis: [
        makeValueAxis({
          name: elev,
          nameLocation: 'middle',
          nameGap: 44,
        }),
      ],
      series,
    };
  }, [hourly, isImperial, elev, fmtDate, resortElevation]);

  return <BaseChart option={option} height={260} group="resort-freeze" />;
}
