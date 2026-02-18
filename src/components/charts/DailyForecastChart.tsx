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
import { cmToIn, getRainDotRating, MM_PER_INCH, MM_PER_CM } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';

interface Props {
  daily: DailyMetrics[];
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
  
  const dotRadius = Math.min(width / 4, 3);
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

export function DailyForecastChart({ daily }: Props) {
  const { temp: tempUnit, snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = tempUnit === 'F';

  const data = daily.map((d) => ({
    date: fmtDate(d.date + 'T12:00:00', { weekday: 'short', month: 'numeric', day: 'numeric' }),
    snow: isImperial ? +cmToIn(d.snowfallSum).toFixed(1) : +d.snowfallSum.toFixed(1),
    rain: isImperial ? +(d.rainSum / MM_PER_INCH).toFixed(2) : +d.rainSum.toFixed(1),
    rainDots: getRainDotRating(isImperial ? d.rainSum / MM_PER_INCH : d.rainSum / MM_PER_CM),
    high: isImperial ? Math.round(d.temperatureMax * 9 / 5 + 32) : Math.round(d.temperatureMax),
    low: isImperial ? Math.round(d.temperatureMin * 9 / 5 + 32) : Math.round(d.temperatureMin),
    feelsHigh: isImperial ? Math.round(d.apparentTemperatureMax * 9 / 5 + 32) : Math.round(d.apparentTemperatureMax),
    feelsLow: isImperial ? Math.round(d.apparentTemperatureMin * 9 / 5 + 32) : Math.round(d.apparentTemperatureMin),
    uv: d.uvIndexMax,
  }));

  const precipLabel = isImperial ? 'in' : snowUnit;
  const tempLabel = `°${tempUnit}`;

  return (
    <div style={{ width: '100%', height: 320, position: 'relative' }}>
      <ResponsiveContainer>
        <ComposedChart data={data} barCategoryGap="20%" barGap="-20%" margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            // padding={{ left: -12, right: -12 }}
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
            // `formatter` receives the value for the series being hovered plus a
            // payload object containing the full data item.  The chart stores both
            // `rain` (raw total) and `rainDots` (0‑3 rating) on each point.  When
            // the user hovers over the artificially‑drawn rain‑dots series we
            // still want to show the total amount of rain, not the number of
            // dots, so inspect the series name and fall back to the payload.
            formatter={(value: number, name: string, props: any) => {
              if (name.includes('Rain')) {
                if (name.includes('dots')) {
                  const rainVal = props?.payload?.rain;
                  if (typeof rainVal === 'number') {
                    return [`${rainVal} ${precipLabel}`, 'Rain'];
                  }
                  // strconv fallback to dots if something unexpected happens
                  const dotCount = typeof value === 'number' ? Math.round(value) : 0;
                  return [`${dotCount} dot${dotCount !== 1 ? 's' : ''}`, name];
                }
              }
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          <Bar yAxisId="precip" dataKey="snow" name={`Snow (${precipLabel})`} fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={30} />
          <Bar yAxisId="precip" dataKey="rainDots" name="Rain (0-3 rating)" fill="#6366f1" maxBarSize={30} shape={RainDots} />
          <Line yAxisId="temp" type="monotone" dataKey="high" name={`High ${tempLabel}`} stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line yAxisId="temp" type="monotone" dataKey="low" name={`Low ${tempLabel}`} stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line yAxisId="temp" type="monotone" dataKey="feelsHigh" name="Feels High" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" dot={false} />
          <Line yAxisId="temp" type="monotone" dataKey="feelsLow" name="Feels Low" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 3" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
