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
import { cmToIn, getRainDotRating, MM_PER_INCH, MM_PER_CM } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';

interface Props {
  hourly: HourlyMetrics[];
}

// Custom shape to render rain dots inside snow bars
interface RainDotsShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { rainDots?: number };
}

function RainDots(props: RainDotsShapeProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const rainDots = payload?.rainDots ?? 0;
  if (!rainDots || rainDots === 0) return <g />;
  
  const dotRadius = Math.min(width / 4, 2.5);
  const dotSpacing = dotRadius * 2.5;
  const totalHeight = rainDots * dotSpacing - dotSpacing / 2;
  const startY = y + height - totalHeight - dotRadius;
  
  const dots = [];
  for (let i = 0; i < rainDots; i++) {
    dots.push(
      <circle
        key={i}
        cx={x + width / 2}
        cy={startY + i * dotSpacing}
        r={dotRadius}
        fill="#6366f1"
        stroke="#1e293b"
        strokeWidth={1}
      />
    );
  }
  
  return <g>{dots}</g>;
}

export function HourlyDetailChart({ hourly }: Props) {
  const { temp: tempUnit, snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = tempUnit === 'F';

  const data = hourly.map((h) => ({
    time: fmtDate(h.time, { weekday: 'short', hour: 'numeric' }),
    snow: isImperial ? +cmToIn(h.snowfall).toFixed(2) : +h.snowfall.toFixed(1),
    rain: isImperial ? +(h.rain / MM_PER_INCH).toFixed(2) : +h.rain.toFixed(1),
    // Scale rain by 1/6 for hourly as specified in requirements
    rainDots: getRainDotRating((isImperial ? h.rain / MM_PER_INCH : h.rain / MM_PER_CM) / 6),
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
            formatter={(value: number, name: string, props: any) => {
              if (name.includes('Rain')) {
                if (name.includes('dots')) {
                  const rainVal = props?.payload?.rain;
                  if (typeof rainVal === 'number') {
                    return [`${rainVal} ${precipLabel}`, 'Rain'];
                  }
                  const dotCount = typeof value === 'number' ? Math.round(value) : 0;
                  return [`${dotCount} dot${dotCount !== 1 ? 's' : ''}`, name];
                }
              }
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="precip" dataKey="snow" name={`Snow (${precipLabel})`} fill="#38bdf8" radius={[3, 3, 0, 0]} />
          <Bar yAxisId="precip" dataKey="rainDots" name="Rain (0-3 rating)" fill="#6366f1" shape={RainDots} />
          <Line yAxisId="temp" type="monotone" dataKey="temp" name={`Temp ${tempLabel}`} stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line yAxisId="temp" type="monotone" dataKey="feels" name={`Feels ${tempLabel}`} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
