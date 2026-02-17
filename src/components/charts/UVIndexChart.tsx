import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { DailyMetrics } from '@/types';

interface Props {
  daily: DailyMetrics[];
}

export function UVIndexChart({ daily }: Props) {
  const data = daily.map((d) => ({
    date: d.date.slice(5), // MM-DD
    uv: d.uvIndexMax,
  }));

  function uvColor(uv: number): string {
    if (uv <= 2) return '#22c55e';
    if (uv <= 5) return '#f59e0b';
    if (uv <= 7) return '#f97316';
    if (uv <= 10) return '#ef4444';
    return '#7c3aed';
  }

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} domain={[0, 12]} />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              borderColor: '#475569',
              borderRadius: 8,
              color: '#f1f5f9',
              fontSize: 13,
            }}
            formatter={(v: number) => [v.toFixed(1), 'UV Index']}
          />
          <Bar dataKey="uv" name="UV Index" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={index} fill={uvColor(entry.uv)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
