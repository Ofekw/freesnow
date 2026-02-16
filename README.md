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
| Charts | Recharts |
| Weather data | [Open-Meteo](https://open-meteo.com/) (free, no API key) |
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

## Data Sources & Attribution

Weather data is provided by **[Open-Meteo](https://open-meteo.com/)** under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license.

> This project uses the Open-Meteo free non-commercial tier. If you intend to
> use FreeSnow commercially, you must obtain your own Open-Meteo API licence or
> swap in an alternative provider.

Resort metadata is curated from public sources (elevations, coordinates, facility counts).

## Roadmap

- [ ] More resorts (global coverage)
- [ ] Map-based resort browser (MapLibre GL)
- [ ] Snow report / current conditions
- [ ] Webcam links
- [ ] Unit toggle (°F/°C, in/cm, ft/m)
- [ ] Backend for accounts, cross-device favorites, alerts
- [ ] Trail map overlays

## License

MIT
