import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { HourlyMetrics } from '@/types';
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
  makeDashedLineSeries,
  makeDataZoom,
} from './echarts-theme';

interface Props {
  hourly: HourlyMetrics[];
}

export function HourlyDetailChart({ hourly }: Props) {
  const { temp: tempUnit, snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = tempUnit === 'F';

  const option = useMemo<EChartsOption>(() => {
    const times = hourly.map((h) =>
      fmtDate(h.time, { weekday: 'short', hour: 'numeric' }),
    );
    const snowData = hourly.map((h) =>
      isImperial ? +cmToIn(h.snowfall).toFixed(2) : +h.snowfall.toFixed(1),
    );
    // Scale rain by 1/6 for hourly as per requirements
    const rainTotals = hourly.map((h) =>
      isImperial ? h.rain / MM_PER_INCH : h.rain / MM_PER_CM,
    );
    const rainDotsData = hourly.map((_, index) =>
      getRainDotRating(rainTotals[index]! / 6),
    );
    const tempData = hourly.map((h) =>
      isImperial ? Math.round(h.temperature * 9 / 5 + 32) : Math.round(h.temperature),
    );
    const feelsData = hourly.map((h) =>
      isImperial ? Math.round(h.apparentTemperature * 9 / 5 + 32) : Math.round(h.apparentTemperature),
    );
    const windData = hourly.map((h) =>
      isImperial ? Math.round(h.windSpeed * 0.621371) : Math.round(h.windSpeed),
    );
    const gustsData = hourly.map((h) =>
      isImperial ? Math.round(h.windGusts * 0.621371) : Math.round(h.windGusts),
    );

    const precipLabel = isImperial ? 'in' : snowUnit;
    const tempLabel = `°${tempUnit}`;
    const windLabel = isImperial ? 'mph' : 'km/h';

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
        [`Snow (${precipLabel})`, `Rain (0-3 rating)`, `Temp ${tempLabel}`, `Feels ${tempLabel}`, `Wind (${windLabel})`, `Gusts (${windLabel})`],
        { bottom: 24 },
      ),
      grid: makeGrid({ bottom: 84, right: 56 }),
      dataZoom: makeDataZoom(0),
      xAxis: [makeCategoryAxis(times)],
      yAxis: [
        makeValueAxis({
          name: precipLabel,
          nameLocation: 'middle',
          nameGap: 36,
          min: 0,
          max: isImperial ? 1 : 2.5,
          interval: isImperial ? 0.2 : 0.5,
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
          symbolSize: [5, 5],
          symbolRepeat: true,
          symbolMargin: 1.5,
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
        makeLineSeries(`Temp ${tempLabel}`, tempData, COLORS.tempHigh, { yAxisIndex: 1 }),
        makeDashedLineSeries(`Feels ${tempLabel}`, feelsData, COLORS.tempHigh, { yAxisIndex: 1 }),
        makeLineSeries(`Wind (${windLabel})`, windData, COLORS.wind, {
          yAxisIndex: 1,
          lineStyle: { color: COLORS.wind, width: 1.5 },
        }),
        makeDashedLineSeries(`Gusts (${windLabel})`, gustsData, COLORS.gusts, {
          yAxisIndex: 1,
        }),
      ],
    };
  }, [hourly, isImperial, tempUnit, snowUnit, fmtDate]);

  return <BaseChart option={option} height={340} group="resort-hourly" />;
}
