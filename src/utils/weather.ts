/**
 * WMO Weather interpretation codes → human label + icon ID.
 * Icon IDs map to Lucide SVG icons via the WeatherIcon component.
 * https://open-meteo.com/en/docs#weathervariables
 */

interface WeatherDesc {
  label: string;
  /** Lucide icon identifier — render with <WeatherIcon name={icon} /> */
  icon: string;
}

const WMO_MAP: Record<number, WeatherDesc> = {
  0: { label: 'Clear sky', icon: 'sun' },
  1: { label: 'Mainly clear', icon: 'sun' },
  2: { label: 'Partly cloudy', icon: 'cloud-sun' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Fog', icon: 'cloud-fog' },
  48: { label: 'Rime fog', icon: 'cloud-fog' },
  51: { label: 'Light drizzle', icon: 'cloud-drizzle' },
  53: { label: 'Drizzle', icon: 'cloud-drizzle' },
  55: { label: 'Dense drizzle', icon: 'cloud-rain' },
  56: { label: 'Light freezing drizzle', icon: 'cloud-rain' },
  57: { label: 'Freezing drizzle', icon: 'cloud-rain' },
  61: { label: 'Slight rain', icon: 'cloud-drizzle' },
  63: { label: 'Rain', icon: 'cloud-rain' },
  65: { label: 'Heavy rain', icon: 'cloud-rain' },
  66: { label: 'Light freezing rain', icon: 'cloud-rain' },
  67: { label: 'Freezing rain', icon: 'cloud-rain' },
  71: { label: 'Slight snow', icon: 'cloud-snow' },
  73: { label: 'Snow', icon: 'cloud-snow' },
  75: { label: 'Heavy snow', icon: 'snowflake' },
  77: { label: 'Snow grains', icon: 'snowflake' },
  80: { label: 'Slight rain showers', icon: 'cloud-drizzle' },
  81: { label: 'Rain showers', icon: 'cloud-rain' },
  82: { label: 'Violent rain showers', icon: 'cloud-rain' },
  85: { label: 'Slight snow showers', icon: 'cloud-snow' },
  86: { label: 'Heavy snow showers', icon: 'snowflake' },
  95: { label: 'Thunderstorm', icon: 'cloud-lightning' },
  96: { label: 'Thunderstorm w/ hail', icon: 'cloud-lightning' },
  99: { label: 'Thunderstorm w/ heavy hail', icon: 'cloud-lightning' },
};

export function weatherDescription(code: number): WeatherDesc {
  return WMO_MAP[code] ?? { label: `Code ${code}`, icon: 'help' };
}

/** Format temperature for display */
export function fmtTemp(celsius: number, unit: 'C' | 'F' = 'F'): string {
  if (unit === 'F') {
    return `${Math.round(celsius * 9 / 5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

/** Format elevation for display */
export function fmtElevation(meters: number, unit: 'ft' | 'm' = 'ft'): string {
  if (unit === 'ft') {
    return `${Math.round(meters * 3.28084).toLocaleString()}ft`;
  }
  return `${Math.round(meters).toLocaleString()}m`;
}

/** cm → inches */
export function cmToIn(cm: number): number {
  return cm / 2.54;
}

/** mm → inches conversion factor */
export const MM_PER_INCH = 25.4;

/** mm → cm conversion factor */
export const MM_PER_CM = 10;

/** Format snowfall for display */
export function fmtSnow(cm: number, unit: 'in' | 'cm' = 'in'): string {
  if (unit === 'in') {
    return `${cmToIn(cm).toFixed(1)}"`;
  }
  return `${cm.toFixed(1)}cm`;
}

/**
 * Calculate rain dot rating (0-3 dots) based on rain amount in inches
 * 0 dots: no rain
 * 1 dot: 0" to 0.1"
 * 2 dots: 0.1" to 0.5"
 * 3 dots: > 0.5"
 */
export function getRainDotRating(rainInches: number): number {
  if (rainInches <= 0) return 0;
  if (rainInches <= 0.1) return 1;
  if (rainInches <= 0.5) return 2;
  return 3;
}
