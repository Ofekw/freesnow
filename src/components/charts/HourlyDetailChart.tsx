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
    const rainData = hourly.map((h) =>
      isImperial ? +(h.rain / 25.4).toFixed(2) : +(h.rain / 10).toFixed(2),
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
      tooltip: makeTooltip(),
      legend: makeLegend(
        [`Snow (${precipLabel})`, `Rain (${precipLabel})`, `Temp ${tempLabel}`, `Feels ${tempLabel}`, `Wind (${windLabel})`, `Gusts (${windLabel})`],
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
        makeBarSeries(`Rain (${precipLabel})`, rainData, COLORS.rain, {
          yAxisIndex: 0,
          itemStyle: { color: COLORS.rain, borderRadius: [3, 3, 0, 0], opacity: 0.75 },
        }),
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
