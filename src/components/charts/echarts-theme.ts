/**
 * FreeSnow ECharts Theme — Grafana-inspired dark dashboard theme
 *
 * Provides a registered ECharts theme + shared builder helpers for
 * consistent chart styling across all FreeSnow charts.
 */
import * as echarts from 'echarts/core';

/* ── Color Tokens (match CSS custom properties) ────────────── */

export const COLORS = {
  bg: '#0b1120',
  surface: '#141b2d',
  surfaceRaised: '#1e2942',
  surfaceAlt: '#2a3550',
  border: '#1e3a5f',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  accent: '#38bdf8',

  /* chart-specific */
  snow: '#38bdf8',
  rain: '#818cf8',
  tempHigh: '#f59e0b',
  tempLow: '#60a5fa',
  freezing: '#22d3ee',
  cumulative: '#a78bfa',
  wind: '#34d399',
  gusts: '#f472b6',
  grid: '#1e3a5f',
  axis: '#475569',

  /* UV severity */
  uvLow: '#22c55e',
  uvModerate: '#f59e0b',
  uvHigh: '#f97316',
  uvVeryHigh: '#ef4444',
  uvExtreme: '#7c3aed',
} as const;

/* ── Shared Tooltip Style ──────────────────────────────────── */

export const TOOLTIP_STYLE = {
  backgroundColor: COLORS.surfaceRaised,
  borderColor: COLORS.border,
  borderWidth: 1,
  borderRadius: 8,
  textStyle: {
    color: COLORS.text,
    fontSize: 12,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  extraCssText: 'box-shadow: 0 4px 16px rgba(0,0,0,0.4); backdrop-filter: blur(8px);',
} as const;

/* ── Axis Defaults ─────────────────────────────────────────── */

const AXIS_LABEL = {
  color: COLORS.textMuted,
  fontSize: 11,
  fontFamily: "'Space Mono', monospace",
};

const AXIS_LINE = { lineStyle: { color: COLORS.axis } };
const AXIS_TICK = { lineStyle: { color: COLORS.axis } };
const SPLIT_LINE = { lineStyle: { color: COLORS.grid, type: 'dashed' as const } };

/* ── Register FreeSnow Theme ───────────────────────────────── */

echarts.registerTheme('freesnow', {
  color: [
    COLORS.snow,
    COLORS.rain,
    COLORS.tempHigh,
    COLORS.tempLow,
    COLORS.freezing,
    COLORS.cumulative,
    COLORS.wind,
    COLORS.gusts,
  ],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: COLORS.text,
  },
  title: {
    textStyle: { color: COLORS.text, fontFamily: "'DM Sans', system-ui, sans-serif" },
    subtextStyle: { color: COLORS.textMuted },
  },
  legend: {
    textStyle: {
      color: COLORS.textMuted,
      fontSize: 11,
      fontFamily: "'DM Sans', system-ui, sans-serif",
    },
    inactiveColor: '#475569',
    pageTextStyle: { color: COLORS.textMuted },
  },
  tooltip: TOOLTIP_STYLE,
  categoryAxis: {
    axisLine: AXIS_LINE,
    axisTick: AXIS_TICK,
    axisLabel: AXIS_LABEL,
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: AXIS_LABEL,
    splitLine: SPLIT_LINE,
  },
  dataZoom: [
    {
      type: 'inside',
      borderColor: COLORS.border,
    },
    {
      type: 'slider',
      backgroundColor: COLORS.surface,
      borderColor: COLORS.border,
      fillerColor: 'rgba(56, 189, 248, 0.12)',
      handleStyle: { color: COLORS.accent },
      textStyle: { color: COLORS.textMuted },
      dataBackground: {
        lineStyle: { color: COLORS.accent, opacity: 0.3 },
        areaStyle: { color: COLORS.accent, opacity: 0.08 },
      },
    },
  ],
});

/* ── Builder Helpers ───────────────────────────────────────── */

/** Standard tooltip with axis pointer crosshair */
export function makeTooltip(
  opts: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      crossStyle: { color: COLORS.textMuted },
      lineStyle: { color: COLORS.border, type: 'dashed' },
    },
    ...TOOLTIP_STYLE,
    ...opts,
  };
}

/** Standard legend with click-to-toggle */
export function makeLegend(
  data: string[],
  opts: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    data,
    bottom: 0,
    left: 'center',
    textStyle: {
      color: COLORS.textMuted,
      fontSize: 11,
      fontFamily: "'DM Sans', system-ui, sans-serif",
    },
    inactiveColor: '#475569',
    itemGap: 16,
    itemWidth: 14,
    itemHeight: 10,
    ...opts,
  };
}

/** Standard grid with Grafana-like padding */
export function makeGrid(
  opts: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    left: 48,
    right: 48,
    top: 16,
    bottom: 48,
    containLabel: false,
    ...opts,
  };
}

/** Category X-axis (dates/times) */
export function makeCategoryAxis(
  data: string[],
  opts: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: 'category',
    data,
    axisLine: AXIS_LINE,
    axisTick: { ...AXIS_TICK, alignWithLabel: true },
    axisLabel: { ...AXIS_LABEL, rotate: 0 },
    ...opts,
  };
}

/** Value Y-axis */
export function makeValueAxis(
  opts: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: AXIS_LABEL,
    splitLine: SPLIT_LINE,
    ...opts,
  };
}

/** Standard bar series config */
export function makeBarSeries(
  name: string,
  data: number[],
  color: string,
  opts: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name,
    type: 'bar',
    data,
    itemStyle: {
      color,
      borderRadius: [3, 3, 0, 0],
    },
    barMaxWidth: 28,
    emphasis: {
      itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' },
    },
    ...opts,
  };
}

/** Standard line series config */
export function makeLineSeries(
  name: string,
  data: number[],
  color: string,
  opts: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name,
    type: 'line',
    data,
    itemStyle: { color },
    lineStyle: { color, width: 2 },
    symbol: 'none',
    smooth: true,
    emphasis: {
      lineStyle: { width: 3 },
    },
    ...opts,
  };
}

/** Dashed line variant */
export function makeDashedLineSeries(
  name: string,
  data: number[],
  color: string,
  opts: Record<string, unknown> = {},
): Record<string, unknown> {
  return makeLineSeries(name, data, color, {
    lineStyle: { color, width: 1.5, type: 'dashed' },
    ...opts,
  });
}

/** Standard dataZoom for slider + inside zoom */
export function makeDataZoom(
  axisIndex: number | number[] = 0,
): Record<string, unknown>[] {
  return [
    {
      type: 'inside',
      xAxisIndex: axisIndex,
      filterMode: 'none',
    },
    {
      type: 'slider',
      xAxisIndex: axisIndex,
      height: 20,
      bottom: 4,
      backgroundColor: COLORS.surface,
      borderColor: COLORS.border,
      fillerColor: 'rgba(56, 189, 248, 0.12)',
      handleStyle: { color: COLORS.accent, borderColor: COLORS.accent },
      textStyle: { color: COLORS.textMuted, fontSize: 10 },
      dataBackground: {
        lineStyle: { color: COLORS.accent, opacity: 0.3 },
        areaStyle: { color: COLORS.accent, opacity: 0.08 },
      },
      selectedDataBackground: {
        lineStyle: { color: COLORS.accent },
        areaStyle: { color: COLORS.accent, opacity: 0.15 },
      },
    },
  ];
}
