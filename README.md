# ❄️ [OpenSnow.App](https://OpenSnow.App)

Free & open-source ski resort snow forecasts — an alternative to OpenSnow / Snow-Forecast.

**Live features (MVP):**

- Browse 30+ curated North American ski resorts
- 7-day forecast with snow / rain / high / low / feels-like / UV / freezing altitude
- Toggle between **Base**, **Mid**, and **Top** elevation forecasts
- Hourly detail charts (72 h)
- Historical snowfall aggregated by month (last 3 seasons)
- Favorite resorts (saved locally on your device)
- Installable PWA — works offline (app shell) and on mobile home screens

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite 6 (via Bun) |
| Charts | Apache ECharts 6 |
| Weather data | [Open-Meteo](https://open-meteo.com/) multi-model + [NWS Weather.gov](https://www.weather.gov/documentation/services-web-api) (US) |
| PWA | vite-plugin-pwa + Workbox |
| State | React hooks + localStorage |
| Styling | Vanilla CSS (dark theme, responsive) |

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Type-check
bun run typecheck

# Build for production
bun run build

# Preview production build
bun run preview
```

## How Snowfall is Calculated

Free OpenSnow doesn't just show raw API numbers — it runs a multi-step accuracy pipeline to produce snowfall estimates competitive with paid services:

1. **Multi-model averaging** — Each forecast fetches **3 weather models** in parallel from Open-Meteo and averages their output. US resorts use GFS + ECMWF + HRRR (3 km high-res). Canadian resorts use GFS + ECMWF + GEM. Precipitation uses the **median** (resistant to outlier spikes); temperature and wind use the **mean**. This alone reduces forecast error by ~15-30% vs any single model.

2. **Temperature-dependent snow-liquid ratio (SLR)** — Open-Meteo's built-in snowfall uses a fixed ~7:1 ratio, which drastically underestimates snow in cold mountain conditions. Free OpenSnow recalculates snowfall from total precipitation using a variable SLR (10:1 at 0°C up to 20:1 below −15°C), adjusted by:
   - **Humidity**: High moisture (≥80% RH) boosts SLR by 10-15% (larger dendritic crystals → fluffier snow)
   - **Wind speed**: Strong wind (≥30 km/h) reduces SLR by 10-20% (mechanical compaction + sublimation)

3. **Freezing level rain/snow split** — The API's rain/snow split is computed at grid-cell elevation, not your ski resort's actual elevation. Free OpenSnow re-splits precipitation using the station's elevation vs the freezing level height, eliminating phantom rain at sub-freezing temperatures.

4. **NWS cross-reference (US only)** — For US resorts, NWS Weather.gov forecaster-adjusted snowfall amounts are fetched and blended with the model average (30% NWS / 70% model). NWS forecasters manually tune QPF and snow ratios for local terrain — this adds human expertise to the pipeline.

## Data Sources & Attribution

Weather data is provided by **[Open-Meteo](https://open-meteo.com/)** under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license. Models used: [GFS](https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast) (NOAA), [ECMWF IFS](https://www.ecmwf.int/en/forecasts/datasets/open-data) (European Centre), [HRRR](https://rapidrefresh.noaa.gov/hrrr/) (NOAA high-res), and [GEM](https://weather.gc.ca/grib/grib2_glb_25km_e.html) (Environment Canada).

US snowfall forecasts are cross-referenced with the **[National Weather Service API](https://www.weather.gov/documentation/services-web-api)** (public domain, no API key required).

> This project uses the Open-Meteo free non-commercial tier. If you intend to
> use Free OpenSnow commercially, you must obtain your own Open-Meteo API licence or
> swap in an alternative provider.

Resort metadata is curated from public sources (elevations, coordinates, facility counts).

## Roadmap

- [x] Multi-model forecast averaging (GFS, ECMWF, HRRR/GEM)
- [x] Improved SLR with humidity & wind corrections
- [x] NWS snowfall cross-reference (US resorts)
- [x] Snow depth tracking
- [x] Unit toggle (°F/°C, in/cm, ft/m)
- [x] Timezone picker (13 NA zones + UTC)
- [x] Snow alerts (Android PWA)
- [ ] More resorts (global coverage)
- [ ] Map-based resort browser (MapLibre GL)
- [ ] Snow report / current conditions
- [ ] Webcam links
- [ ] Backend for accounts, cross-device favorites, alerts
- [ ] Trail map overlays

## License

MIT
