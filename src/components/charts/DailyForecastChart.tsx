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
    const rainDotsData = daily.map((d) =>
      getRainDotRating(isImperial ? d.rainSum / MM_PER_INCH : d.rainSum / MM_PER_CM),
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
          tooltip: {
            formatter: (params: any) => {
              const dotCount = params.value || 0;
              return `${params.name}<br/>${params.seriesName}: ${dotCount} dot${dotCount !== 1 ? 's' : ''}`;
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
