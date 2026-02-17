import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { DailyMetrics } from '@/types';
import { cmToIn, fmtSnow } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';

interface Props {
  days: DailyMetrics[];
}

export function RecentSnowChart({ days }: Props) {
  const { temp: tempUnit, snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = snowUnit === 'in';

  const totalSnow = days.reduce((s, d) => s + d.snowfallSum, 0);

  // Build data with running total
  let runningTotal = 0;
  const data = days.map((d) => {
    const snowVal = isImperial ? +cmToIn(d.snowfallSum).toFixed(1) : +d.snowfallSum.toFixed(1);
    runningTotal += snowVal;
    const high = isImperial
      ? Math.round(d.temperatureMax * 9 / 5 + 32)
      : Math.round(d.temperatureMax);
    const low = isImperial
      ? Math.round(d.temperatureMin * 9 / 5 + 32)
      : Math.round(d.temperatureMin);
    return {
      date: fmtDate(d.date + 'T12:00:00', { month: 'numeric', day: 'numeric' }),
      snow: snowVal,
      cumulative: +runningTotal.toFixed(1),
      high,
      low,
    };
  });

  const precipLabel = isImperial ? 'in' : 'cm';
  const tempLabel = `°${tempUnit}`;

  return (
    <div className="recent-snow-chart">
      <div className="recent-snow-chart__header">
        <span className="recent-snow-chart__total">
          <strong>{fmtSnow(totalSnow, snowUnit)}</strong>
          <span className="recent-snow-chart__subtitle"> over {days.length} days</span>
        </span>
      </div>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="snow"
              orientation="left"
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
            <YAxis
              yAxisId="temp"
              orientation="right"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
              label={{
                value: tempLabel,
                angle: 90,
                position: 'insideRight',
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
                if (name === 'Snowfall') return [`${v} ${precipLabel}`, name];
                if (name === 'Total') return [`${v} ${precipLabel}`, name];
                return [`${v}${tempLabel}`, name];
              }}
            />
            <Bar
              yAxisId="snow"
              dataKey="snow"
              name="Snowfall"
              fill="#38bdf8"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
              isAnimationActive={false}
            />
            <Line
              yAxisId="snow"
              type="monotone"
              dataKey="cumulative"
              name="Total"
              stroke="#818cf8"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 3"
              isAnimationActive={false}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="high"
              name="High"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              opacity={0.5}
              isAnimationActive={false}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="low"
              name="Low"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              opacity={0.5}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
