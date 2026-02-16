import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { DailyMetrics } from '@/types';
import { cmToIn } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';

interface Props {
  daily: DailyMetrics[];
}

export function DailyForecastChart({ daily }: Props) {
  const { temp: tempUnit, snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = tempUnit === 'F';

  const data = daily.map((d) => ({
    date: fmtDate(d.date + 'T12:00:00', { weekday: 'short', month: 'numeric', day: 'numeric' }),
    snow: isImperial ? +cmToIn(d.snowfallSum).toFixed(1) : +d.snowfallSum.toFixed(1),
    rain: isImperial ? +(d.rainSum / 25.4).toFixed(2) : +d.rainSum.toFixed(1),
    high: isImperial ? Math.round(d.temperatureMax * 9 / 5 + 32) : Math.round(d.temperatureMax),
    low: isImperial ? Math.round(d.temperatureMin * 9 / 5 + 32) : Math.round(d.temperatureMin),
    feelsHigh: isImperial ? Math.round(d.apparentTemperatureMax * 9 / 5 + 32) : Math.round(d.apparentTemperatureMax),
    feelsLow: isImperial ? Math.round(d.apparentTemperatureMin * 9 / 5 + 32) : Math.round(d.apparentTemperatureMin),
    uv: d.uvIndexMax,
  }));

  const precipLabel = isImperial ? 'in' : snowUnit;
  const tempLabel = `°${tempUnit}`;

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} barCategoryGap="15%" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis
            yAxisId="precip"
            orientation="left"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            label={{ value: precipLabel, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            yAxisId="temp"
            orientation="right"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            label={{ value: tempLabel, angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              borderColor: '#475569',
              borderRadius: 8,
              color: '#f1f5f9',
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          <Bar yAxisId="precip" stackId="precip" dataKey="snow" name={`Snow (${precipLabel})`} fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={30} />
          <Bar yAxisId="precip" stackId="precip" dataKey="rain" name={`Rain (${precipLabel})`} fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30} />
          <Line yAxisId="temp" type="monotone" dataKey="high" name={`High ${tempLabel}`} stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line yAxisId="temp" type="monotone" dataKey="low" name={`Low ${tempLabel}`} stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line yAxisId="temp" type="monotone" dataKey="feelsHigh" name="Feels High" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" dot={false} />
          <Line yAxisId="temp" type="monotone" dataKey="feelsLow" name="Feels Low" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 3" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
