import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { DailyMetrics } from '@/types';
import { cmToIn, getRainDotRating, MM_PER_INCH, MM_PER_CM } from '@/utils/weather';
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
    const rainTotals = daily.map((d) =>
      isImperial ? d.rainSum / MM_PER_INCH : d.rainSum / MM_PER_CM,
    );
    const rainDotsData = daily.map((_, index) =>
      getRainDotRating(rainTotals[index]!),
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
      tooltip: {
        ...makeTooltip(),
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          
          const rainUnit = isImperial ? 'in' : 'cm';
          const lines = params
            .map((p: any) => {
              const colorCircle = `<span style="display:inline-block;margin-right:4px;width:8px;height:8px;border-radius:50%;background-color:${p.color};"></span>`;
              
              // Special handling for rain series
              if (p.seriesName === `Rain (0-3 rating)`) {
                const rainTotal = rainTotals[p.dataIndex] || 0;
                const rainFormatted = rainTotal.toFixed(isImperial ? 2 : 1);
                return `${colorCircle}Rain (${rainUnit}): ${rainFormatted}`;
              }
              // Default formatting for other series
              return `${colorCircle}${p.seriesName}: ${p.value}`;
            })
            .filter(Boolean);
          
          return lines.join('<br/>');
        },
      },
      legend: makeLegend(
        [`Snow (${precipLabel})`, `Rain (0-3 rating)`, `High ${tempLabel}`, `Low ${tempLabel}`],
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
        // Rain dots as pictorial bar with custom rendering
        {
          name: `Rain (0-3 rating)`,
          type: 'pictorialBar',
          data: rainDotsData,
          yAxisIndex: 0,
          symbol: 'circle',
          symbolSize: [6, 6],
          symbolRepeat: true,
          symbolMargin: 2,
          symbolClip: true,
          symbolPosition: 'start',
          itemStyle: {
            color: COLORS.rain,
          },
          emphasis: {
            itemStyle: {
              color: COLORS.rain,
              opacity: 1,
            },
          },
          z: 10, // Render on top of snow bars
        },
        makeLineSeries(`High ${tempLabel}`, highData, COLORS.tempHigh, { yAxisIndex: 1 }),
        makeLineSeries(`Low ${tempLabel}`, lowData, COLORS.tempLow, { yAxisIndex: 1 }),
      ],
    };
  }, [daily, isImperial, tempUnit, snowUnit, fmtDate]);

  return <BaseChart option={option} height={340} group="resort-daily" />;
}
