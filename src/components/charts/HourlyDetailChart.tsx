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
import type { HourlyMetrics } from '@/types';
import { cmToIn } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';

interface Props {
  hourly: HourlyMetrics[];
}

export function HourlyDetailChart({ hourly }: Props) {
  const { temp: tempUnit, snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = tempUnit === 'F';

  const data = hourly.map((h) => ({
    time: fmtDate(h.time, { weekday: 'short', hour: 'numeric' }),
    snow: isImperial ? +cmToIn(h.snowfall).toFixed(2) : +h.snowfall.toFixed(1),
    rain: isImperial ? +(h.rain / 25.4).toFixed(2) : +(h.rain / 10).toFixed(2),
    temp: isImperial ? Math.round(h.temperature * 9 / 5 + 32) : Math.round(h.temperature),
    feels: isImperial ? Math.round(h.apparentTemperature * 9 / 5 + 32) : Math.round(h.apparentTemperature),
    wind: isImperial ? Math.round(h.windSpeed * 0.621371) : Math.round(h.windSpeed),
    gusts: isImperial ? Math.round(h.windGusts * 0.621371) : Math.round(h.windGusts),
  }));

  const precipLabel = isImperial ? 'in' : snowUnit;
  const tempLabel = `°${tempUnit}`;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            interval="preserveStartEnd"
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis
            yAxisId="precip"
            orientation="left"
            domain={[0, isImperial ? 1 : 2.5]}
            ticks={isImperial ? [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] : [0, 0.5, 1.0, 1.5, 2.0, 2.5]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis
            yAxisId="temp"
            orientation="right"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#475569' }}
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
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="precip" dataKey="snow" name={`Snow (${precipLabel})`} fill="#38bdf8" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar yAxisId="precip" dataKey="rain" name={`Rain (${precipLabel})`} fill="#6366f1" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Line yAxisId="temp" type="monotone" dataKey="temp" name={`Temp ${tempLabel}`} stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line yAxisId="temp" type="monotone" dataKey="feels" name={`Feels ${tempLabel}`} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
