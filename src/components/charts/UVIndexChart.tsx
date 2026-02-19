import { useMemo } from 'react';
import type { DailyMetrics } from '@/types';
import { useTimezone } from '@/context/TimezoneContext';
import { BaseChart } from './BaseChart';
import {
  COLORS,
  makeTooltip,
  makeGrid,
  makeCategoryAxis,
  makeValueAxis,
} from './echarts-theme';

interface Props {
  daily: DailyMetrics[];
}

function uvColor(uv: number): string {
  if (uv <= 2) return COLORS.uvLow;
  if (uv <= 5) return COLORS.uvModerate;
  if (uv <= 7) return COLORS.uvHigh;
  if (uv <= 10) return COLORS.uvVeryHigh;
  return COLORS.uvExtreme;
}

function uvLabel(uv: number): string {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

export function UVIndexChart({ daily }: Props) {
  const { fmtDate } = useTimezone();

  const option = useMemo(() => {
    const dates = daily.map((d) =>
      fmtDate(d.date + 'T12:00:00', { weekday: 'short', month: 'numeric', day: 'numeric' }),
    );
    const uvData = daily.map((d) => ({
      value: d.uvIndexMax,
      itemStyle: { color: uvColor(d.uvIndexMax) },
    }));

    return {
      tooltip: makeTooltip({
        formatter(params: unknown) {
          const items = Array.isArray(params) ? params as Array<{ value: number; axisValueLabel: string; marker: string }> : [];
          if (items.length === 0) return '';
          const item = items[0]!;
          const uv = item.value;
          return `<div style="font-weight:600;margin-bottom:4px">${item.axisValueLabel}</div>
            <div>${item.marker} UV Index: <strong>${uv.toFixed(1)}</strong> (${uvLabel(uv)})</div>`;
        },
      }),
      legend: {
        data: [
          { name: 'Low (0–2)', itemStyle: { color: COLORS.uvLow } },
          { name: 'Moderate (3–5)', itemStyle: { color: COLORS.uvModerate } },
          { name: 'High (6–7)', itemStyle: { color: COLORS.uvHigh } },
          { name: 'Very High (8–10)', itemStyle: { color: COLORS.uvVeryHigh } },
          { name: 'Extreme (11+)', itemStyle: { color: COLORS.uvExtreme } },
        ],
        bottom: 0,
        left: 'center' as const,
        textStyle: { color: COLORS.textMuted, fontSize: 10, fontFamily: "'DM Sans', system-ui, sans-serif" },
        itemGap: 12,
        itemWidth: 10,
        itemHeight: 10,
        selectedMode: false as const,
      },
      grid: makeGrid({ bottom: 48, left: 36, right: 12 }),
      xAxis: [makeCategoryAxis(dates)],
      yAxis: [
        makeValueAxis({
          min: 0,
          max: 12,
          interval: 2,
        }),
      ],
      series: [
        {
          name: 'UV Index',
          type: 'bar' as const,
          data: uvData,
          barMaxWidth: 28,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          emphasis: {
            itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' },
          },
          label: {
            show: true,
            position: 'top' as const,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (p: any) => {
              const val = (p as { value: number }).value;
              return val.toFixed(1);
            },
            color: COLORS.textMuted,
            fontSize: 10,
            fontFamily: "'Space Mono', monospace",
          },
        },
        // Invisible series for legend color indicators
        ...[
          { name: 'Low (0–2)', color: COLORS.uvLow },
          { name: 'Moderate (3–5)', color: COLORS.uvModerate },
          { name: 'High (6–7)', color: COLORS.uvHigh },
          { name: 'Very High (8–10)', color: COLORS.uvVeryHigh },
          { name: 'Extreme (11+)', color: COLORS.uvExtreme },
        ].map(({ name, color }) => ({
          name,
          type: 'bar' as const,
          data: [] as number[],
          itemStyle: { color },
        })),
      ],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily, fmtDate]);

  return <BaseChart option={option} height={220} />;
}
