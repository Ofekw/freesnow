/**
 * BaseChart — Thin wrapper around ReactECharts applying the FreeSnow theme.
 *
 * Handles: theme registration, responsive resize, loading skeleton,
 * and consistent container styling across all charts.
 */
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
// Side-effect: registers the 'freesnow' theme on first import
import './echarts-theme';

interface Props {
  option: EChartsOption;
  height?: number | string;
  /** ECharts group id for cross-chart sync (tooltip + dataZoom) */
  group?: string;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function BaseChart({
  option,
  height = 320,
  group,
  loading = false,
  className,
  style,
}: Props) {
  return (
    <div
      className={`base-chart ${className ?? ''}`}
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        position: 'relative',
        ...style,
      }}
    >
      {loading ? (
        <div className="base-chart__skeleton" />
      ) : (
        <ReactECharts
          option={option}
          theme="freesnow"
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge
          lazyUpdate
          onChartReady={(chart) => {
            if (group) {
              chart.group = group;
              echarts.connect(group);
            }
          }}
        />
      )}
    </div>
  );
}
