import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { HourlyMetrics } from '@/types';
import { cmToIn } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';

interface Props {
  hourly: HourlyMetrics[];
  /** Label shown above chart, e.g. "Monday 2/10" */
  dayLabel: string;
}

export function HourlySnowChart({ hourly, dayLabel }: Props) {
  const { snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = snowUnit === 'in';

  const data = hourly.map((h) => {
    const snowVal = isImperial ? +cmToIn(h.snowfall).toFixed(2) : +h.snowfall.toFixed(1);
    return {
      hour: fmtDate(h.time, { hour: 'numeric' }),
      snow: snowVal,
      prob: h.precipitationProbability,
    };
  });

  const totalSnow = hourly.reduce((s, h) => s + h.snowfall, 0);
  const totalDisplay = isImperial
    ? `${cmToIn(totalSnow).toFixed(1)}"`
    : `${totalSnow.toFixed(1)}cm`;
  const precipLabel = isImperial ? 'in' : 'cm';
  const hasSnow = totalSnow > 0;

  return (
    <div className="hourly-snow-chart">
      <div className="hourly-snow-chart__header">
        <span className="hourly-snow-chart__label">{dayLabel}</span>
        <span className={`hourly-snow-chart__total ${hasSnow ? 'has-snow' : ''}`}>
          {hasSnow ? `❄️ ${totalDisplay}` : 'No snow expected'}
        </span>
      </div>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, isImperial ? 1 : 2.5]}
              ticks={isImperial ? [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] : [0, 0.5, 1.0, 1.5, 2.0, 2.5]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
              label={{
                value: precipLabel,
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                background: '#1e293b',
                borderColor: '#475569',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 13,
              }}
              formatter={(v: number, name: string) => {
                if (name === 'Snow') return [`${v} ${precipLabel}`, 'Snow'];
                return [`${v}%`, 'Precip %'];
              }}
            />
            <ReferenceLine y={0} stroke="#475569" />
            <Bar
              dataKey="snow"
              name="Snow"
              fill="#38bdf8"
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
