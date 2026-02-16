# FreeSnow — Original Project Plan

## Vision

Build **FreeSnow** — a free, open-source Progressive Web App (PWA) that serves as an alternative to OpenSnow and Snow-Forecast.com. The app provides ski resort snow forecasts and weather data for North America with no backend, no accounts, and no API keys required.

## Core Principles

1. **Free & open-source** — MIT license, fully transparent
2. **No backend required** — all data fetched client-side from Open-Meteo's free API
3. **Non-commercial** — stays within Open-Meteo's free tier restrictions
4. **North America only** (MVP scope) — curated catalog of 30+ major resorts
5. **Offline-capable** — installable PWA with service worker caching
6. **Local-only state** — favorites, preferences stored in localStorage

## Tech Stack

| Layer         | Choice                            |
|---------------|-----------------------------------|
| Framework     | React 19 + TypeScript 5.7         |
| Build / PM    | Vite 6 + Bun 1.3.9                |
| Charts        | Recharts                          |
| Weather Data  | Open-Meteo (free, no API key)     |
| PWA           | vite-plugin-pwa + Workbox         |
| Routing       | react-router-dom v7               |
| Date Utils    | date-fns v4                       |
| Styling       | Vanilla CSS (dark theme, CSS custom properties) |
| State         | React hooks + Context + localStorage |

## MVP Feature Set

### Home Page
- [ ] Search bar to filter resorts by name
- [ ] Resort cards grouped by region (state/province)
- [ ] Favorites section pinned to top (inline on home page)
- [ ] Favorite cards show forecast summary (next 3 days snow + high/low)

### Resort Detail Page
- [ ] Header with resort name, region, website link, favorite toggle
- [ ] Quick stats row (base/mid/top elevation, vertical drop, lifts, acres)
- [ ] Elevation band toggle (Base / Mid / Top)
- [ ] 7-day forecast day cards (weather icon, high/low, snowfall)
- [ ] Daily forecast chart (snow + rain bars, temperature lines)
- [ ] Hourly detail chart (72 hours — snow, rain, temp, feels-like)
- [ ] UV Index chart (daily bars, color-coded by level)
- [ ] Freezing level chart (hourly area chart)
- [ ] Recent snowfall section (past 14 days)

### Data Layer
- [ ] Open-Meteo forecast API integration (hourly + daily params)
- [ ] Forecast endpoint with `past_days` for recent history (avoids archive API lag)
- [ ] Historical/archive endpoint for multi-season snow data
- [ ] Type-safe data models (Resort, HourlyMetrics, DailyMetrics, BandForecast)
- [ ] Three elevation bands per resort (base, mid, top)

### User Preferences
- [ ] Imperial / Metric unit toggle (°F/°C, in/cm, ft/m)
- [ ] Timezone picker (13 curated NA zones + UTC)
- [ ] Both persisted to localStorage

### PWA
- [ ] Service worker with StaleWhileRevalidate caching
- [ ] Installable on mobile home screens
- [ ] App shell works offline

### Design
- [ ] Dark theme (slate palette: `#0f172a` bg, `#1e293b` surface, `#38bdf8` accent)
- [ ] Responsive layout (mobile-first)
- [ ] Floating FAB buttons for units and timezone (top-right)
- [ ] WMO weather code → emoji + label mapping

## Resort Catalog (MVP)

31 curated North American resorts across:
- **Colorado** — Vail, Breckenridge, Aspen, Steamboat, Telluride, Winter Park, Keystone, Copper Mountain
- **Utah** — Park City, Snowbird, Alta, Brighton
- **California** — Palisades Tahoe, Mammoth Mountain, Heavenly
- **Montana** — Big Sky, Whitefish
- **Wyoming** — Jackson Hole
- **Vermont** — Stowe, Killington, Sugarbush
- **New Hampshire** — Cannon Mountain
- **Washington** — Crystal Mountain, Stevens Pass
- **Oregon** — Mt. Bachelor
- **British Columbia** — Whistler Blackcomb, Revelstoke, Sun Peaks
- **Alberta** — Lake Louise, Sunshine Village, Banff Norquay

## API Design

### Forecast Endpoint
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &elevation={elev}
  &hourly=temperature_2m,apparent_temperature,snowfall,rain,
          precipitation_probability,wind_speed_10m,freezing_level_height
  &daily=weather_code,temperature_2m_max,temperature_2m_min,
         apparent_temperature_max,apparent_temperature_min,
         snowfall_sum,rain_sum,uv_index_max
  &forecast_days={7}&past_days={0-14}
  &timezone={tz}
```

### Archive Endpoint
```
GET https://archive-api.open-meteo.com/v1/archive
  ?latitude={lat}&longitude={lon}
  &elevation={elev}
  &daily=snowfall_sum,temperature_2m_max,temperature_2m_min
  &start_date={YYYY-MM-DD}&end_date={YYYY-MM-DD}
  &timezone={tz}
```

## File Structure

```
src/
├── main.tsx                    # Entry point (providers + router)
├── App.tsx                     # Route definitions
├── types.ts                    # All type interfaces
├── components/
│   ├── Layout.tsx/css          # App shell, footer, FAB buttons
│   ├── ResortCard.tsx/css      # Resort list card
│   ├── FavoriteCard.tsx/css    # Favorite card with forecast preview
│   ├── ElevationToggle.tsx/css # Base/Mid/Top segmented control
│   └── charts/
│       ├── DailyForecastChart.tsx
│       ├── HourlyDetailChart.tsx
│       ├── FreezingLevelChart.tsx
│       ├── UVIndexChart.tsx
│       └── SnowHistoryChart.tsx
├── context/
│   ├── UnitsContext.tsx        # Imperial/Metric toggle
│   └── TimezoneContext.tsx     # IANA timezone picker
├── data/
│   ├── resorts.ts              # Resort catalog (31 resorts)
│   ├── openmeteo.ts            # API fetch functions
│   └── favorites.ts            # localStorage helpers
├── hooks/
│   ├── useWeather.ts           # Data fetching hooks
│   └── useFavorites.ts         # Favorites hook
├── pages/
│   ├── HomePage.tsx/css        # Resort browser + favorites
│   └── ResortPage.tsx/css      # Resort detail view
├── utils/
│   └── weather.ts              # Unit formatting, WMO codes
└── styles/
    └── (global/index CSS)
```

## Roadmap (Post-MVP)

- More resorts (global coverage)
- Map-based resort browser (MapLibre GL)
- Snow report / current conditions
- Webcam links
- Backend for accounts, cross-device favorites, alerts
- Trail map overlays
