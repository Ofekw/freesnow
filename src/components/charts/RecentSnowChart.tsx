import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { DailyMetrics } from '@/types';
import { cmToIn, fmtSnow } from '@/utils/weather';
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
  makeDashedLineSeries,
  makeDataZoom,
} from './echarts-theme';

interface Props {
  days: DailyMetrics[];
}

export function RecentSnowChart({ days }: Props) {
  const { temp: tempUnit, snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = snowUnit === 'in';

  const totalSnow = days.reduce((s, d) => s + d.snowfallSum, 0);

  const option = useMemo<EChartsOption>(() => {
    let runningTotal = 0;
    const dates: string[] = [];
    const snowData: number[] = [];
    const cumulativeData: number[] = [];
    const highData: number[] = [];
    const lowData: number[] = [];

    for (const d of days) {
      dates.push(fmtDate(d.date + 'T12:00:00', { month: 'numeric', day: 'numeric' }));
      const snowVal = isImperial ? +cmToIn(d.snowfallSum).toFixed(1) : +d.snowfallSum.toFixed(1);
      snowData.push(snowVal);
      runningTotal += snowVal;
      cumulativeData.push(+runningTotal.toFixed(1));
      highData.push(isImperial
        ? Math.round(d.temperatureMax * 9 / 5 + 32)
        : Math.round(d.temperatureMax));
      lowData.push(isImperial
        ? Math.round(d.temperatureMin * 9 / 5 + 32)
        : Math.round(d.temperatureMin));
    }

    const precipLabel = isImperial ? 'in' : 'cm';
    const tempLabel = `°${tempUnit}`;

    return {
      tooltip: makeTooltip({
        formatter(params: unknown) {
          const items = Array.isArray(params) ? params as Array<{ seriesName: string; value: number; axisValueLabel: string; marker: string }> : [];
          const first = items[0];
          if (!first) return '';
          let html = `<div style="font-weight:600;margin-bottom:4px">${first.axisValueLabel}</div>`;
          for (const item of items) {
            const unit = item.seriesName.includes('High') || item.seriesName.includes('Low')
              ? tempLabel
              : ` ${precipLabel}`;
            html += `<div>${item.marker} ${item.seriesName}: <strong>${item.value}${unit}</strong></div>`;
          }
          return html;
        },
      }),
      legend: makeLegend(['Snowfall', 'Cumulative', 'High', 'Low'], { bottom: 24 }),
      grid: makeGrid({ bottom: 84, right: 48 }),
      dataZoom: makeDataZoom(0),
      xAxis: [makeCategoryAxis(dates, { axisTick: { show: false } })],
      yAxis: [
        makeValueAxis({
          name: precipLabel,
          nameLocation: 'middle',
          nameGap: 36,
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
        makeBarSeries('Snowfall', snowData, COLORS.snow, {
          yAxisIndex: 0,
          barMaxWidth: 18,
        }),
        makeDashedLineSeries('Cumulative', cumulativeData, COLORS.cumulative, {
          yAxisIndex: 0,
          lineStyle: { color: COLORS.cumulative, width: 2, type: 'dashed' },
        }),
        makeLineSeries('High', highData, COLORS.tempHigh, {
          yAxisIndex: 1,
          lineStyle: { color: COLORS.tempHigh, width: 1.5, opacity: 0.5 },
          itemStyle: { color: COLORS.tempHigh, opacity: 0.5 },
        }),
        makeLineSeries('Low', lowData, COLORS.tempLow, {
          yAxisIndex: 1,
          lineStyle: { color: COLORS.tempLow, width: 1.5, opacity: 0.5 },
          itemStyle: { color: COLORS.tempLow, opacity: 0.5 },
        }),
      ],
    };
  }, [days, isImperial, tempUnit, fmtDate]);

  return (
    <div className="recent-snow-chart">
      <div className="recent-snow-chart__header">
        <span className="recent-snow-chart__total">
          <strong>{fmtSnow(totalSnow, snowUnit)}</strong>
          <span className="recent-snow-chart__subtitle"> over {days.length} days</span>
        </span>
      </div>
      <BaseChart option={option} height={280} group="resort-recent" />
    </div>
  );
}
