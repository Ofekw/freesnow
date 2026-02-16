import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { HourlyMetrics } from '@/types';
import { useUnits } from '@/context/UnitsContext';
import { format, parseISO } from 'date-fns';

interface Props {
  hourly: HourlyMetrics[];
}

export function FreezingLevelChart({ hourly }: Props) {
  const { elev } = useUnits();
  const isImperial = elev === 'ft';

  const data = hourly.map((h) => ({
    time: format(parseISO(h.time), 'EEE ha'),
    freezeAlt: isImperial
      ? Math.round(h.freezingLevelHeight * 3.28084)
      : Math.round(h.freezingLevelHeight),
  }));

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            interval="preserveStartEnd"
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#475569' }}
            label={{
              value: elev,
              angle: -90,
              position: 'insideLeft',
              fill: '#94a3b8',
              fontSize: 11,
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
            formatter={(v: number) => [`${v.toLocaleString()} ${elev}`, 'Freeze Alt']}
          />
          <Area
            type="monotone"
            dataKey="freezeAlt"
            name="Freezing Level"
            stroke="#38bdf8"
            fill="#38bdf8"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
