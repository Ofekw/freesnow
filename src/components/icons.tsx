/**
 * WeatherIcon — Maps weather icon IDs to Lucide SVG icons.
 *
 * Used by weatherDescription() which returns an icon ID string.
 * Renders consistent cross-platform SVG icons instead of emojis.
 */
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  Snowflake,
  CloudLightning,
  HelpCircle,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';

const WEATHER_ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  'sun': Sun,
  'cloud-sun': CloudSun,
  'cloud': Cloud,
  'cloud-fog': CloudFog,
  'cloud-drizzle': CloudDrizzle,
  'cloud-rain': CloudRain,
  'cloud-snow': CloudSnow,
  'snowflake': Snowflake,
  'cloud-lightning': CloudLightning,
  'help': HelpCircle,
};

interface WeatherIconProps {
  /** Icon ID returned by weatherDescription() */
  name: string;
  size?: number;
  className?: string;
}

export function WeatherIcon({ name, size = 20, className }: WeatherIconProps) {
  const Icon = WEATHER_ICON_MAP[name] ?? HelpCircle;
  return <Icon size={size} className={className} />;
}
