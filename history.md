# FreeSnow — Implementation History

A chronological log of all implementation work, decisions, and changes made during the build of FreeSnow.

---

## Phase 1: Project Initialization

### Scaffolding
- Created a Vite 6 + React 19 + TypeScript 5.7 project using Bun 1.3.9
- Installed dependencies: `react`, `react-dom`, `react-router-dom@7`, `recharts`, `date-fns@4`, `vite-plugin-pwa`, `workbox-*`
- Configured path alias `@/*` → `src/*` in `tsconfig.json` and `vite.config.ts`
- Set up PWA manifest and service worker (StaleWhileRevalidate caching via Workbox)
- Created dark theme CSS with custom properties (`--color-bg: #0f172a`, `--color-surface: #1e293b`, `--color-accent: #38bdf8`, etc.)

### Data Layer
- Defined all TypeScript interfaces in `src/types.ts`: `Resort`, `HourlyMetrics`, `DailyMetrics`, `BandForecast`, `ResortForecast`, `ElevationBand`
- Built `src/data/openmeteo.ts` with `fetchForecast()` and `fetchHistorical()` — both hit Open-Meteo's free API (no key needed)
- Created `src/data/resorts.ts` with 31 curated North American ski resorts (CO, UT, CA, MT, WY, VT, NH, WA, OR, BC, AB) including coordinates, elevations, vertical drop, lifts, and acres
- Built `src/data/favorites.ts` for localStorage-based favorites management
- Created `src/hooks/useWeather.ts` (`useForecast`, `useHistorical`) and `src/hooks/useFavorites.ts`

### Utility Layer
- `src/utils/weather.ts`: Unit conversion functions (`fmtTemp`, `fmtElevation`, `fmtSnow`, `cmToIn`) and WMO weather code → emoji + label mapping (`weatherDescription`)

---

## Phase 2: Core UI

### App Shell & Routing
- `src/main.tsx`: Entry point wrapping App in providers and `BrowserRouter`
- `src/App.tsx`: Routes — `/` → HomePage, `/resort/:slug` → ResortPage
- `src/components/Layout.tsx`: App layout with `<Outlet>`, footer with Open-Meteo attribution

### Home Page (`src/pages/HomePage.tsx`)
- Search bar filtering resorts by name
- Resorts grouped by region (state/province)
- Resort cards (`src/components/ResortCard.tsx`) with name, region, elevation, favorite toggle

### Resort Detail Page (`src/pages/ResortPage.tsx`)
- Header with resort name, region, website link, favorite star
- Quick stats row (base/mid/top elevation, vertical drop, lifts, acres)
- Elevation band toggle (`src/components/ElevationToggle.tsx`) — Base/Mid/Top segmented control
- 7-day forecast day cards (weather icon, high/low, snowfall)
- Refresh button

### Chart Components
- `DailyForecastChart.tsx` — ComposedChart: snow + rain bars with high/low/feels-like temperature lines, dual Y-axes
- `HourlyDetailChart.tsx` — ComposedChart: hourly snow + rain + temp + feels-like (72 hours)
- `UVIndexChart.tsx` — BarChart with Cell-based per-bar coloring by UV severity level
- `FreezingLevelChart.tsx` — AreaChart showing freezing altitude over time
- `SnowHistoryChart.tsx` — Historical snowfall by month (multi-season)

---

## Phase 3: Favorites Redesign

### Removed Dedicated Favorites Tab
- Originally had a separate `/favorites` route — removed it
- Favorites section now displayed inline at the top of the Home Page

### FavoriteCard Component (`src/components/FavoriteCard.tsx`)
- Richer card showing forecast summary for favorited resorts
- Displays next 3 days: snowfall + high/low temps
- Clickable — navigates to resort detail page
- Fetches its own forecast data on mount

### Bug Fixes
- **Archive API lag**: Open-Meteo archive endpoint has ~5 day delay for recent data. Switched recent snowfall to use the forecast endpoint's `past_days` parameter instead.
- **Variable name collision**: `snow` from `useUnits()` conflicted with snowfall value variable in `RecentSnowTable` → renamed to `snowUnit`.
- **Toggle name collision**: `toggle` from `useFavorites()` conflicted in ResortPage → renamed to `toggleFav`.

---

## Phase 4: Imperial / Metric Toggle

### UnitsContext (`src/context/UnitsContext.tsx`)
- Created `UnitSystem` type: `'imperial' | 'metric'`
- Context provides: `{ units, toggle, temp, elev, snow }` (derived display units)
- Persisted to localStorage key `freesnow_units`
- Wired through all components and chart components

### Floating FAB Button
- Added to `Layout.tsx` as a fixed-position pill button in the top-right corner
- Shows current units (e.g., `°F / ft` or `°C / m`)
- Click toggles between imperial and metric

---

## Phase 5: Header Banner Removal

- Removed the static header/banner component
- Units FAB now floats freely at the top-right as a fixed-position element
- Cleaner look — no wasted vertical space

---

## Phase 6: Timezone Support

### TimezoneContext (`src/context/TimezoneContext.tsx`)
- `TZ_OPTIONS` array: 13 curated North American timezones + UTC
- Each option has IANA key, display label, and reference city
- `getUtcOffset()` helper computes live UTC offset for any IANA timezone
- Context provides: `{ tz, tzRaw, tzLabel, setTz, fmtDate }`
- `fmtDate` uses `Intl.DateTimeFormat` with the selected timezone (no date-fns needed for display)
- Persisted to localStorage key `freesnow_tz`

### Timezone Picker UI (Layout.tsx)
- Second FAB button (`🌐 Browser`) in the top-right FAB group
- Click opens a dropdown with:
  - Search input for filtering timezones
  - List of timezone options with UTC offset badges (e.g., `UTC-7`)
  - Click-outside-to-close behavior
- All API calls pass the selected timezone to Open-Meteo
- All date formatting uses the selected timezone

### Unicode Bug Fix
- `\u00b0` and `\ud83c\udf10` escaped sequences in JSX rendered as literal backslash strings
- Replaced with actual `°` and `🌐` characters

---

## Phase 7: Resort Detail Page Redesign

### New Chart Components
- **`HourlySnowChart.tsx`** — Bar chart showing hourly snowfall for a single selected day. Displays total snowfall for the day. Uses recharts BarChart with hour labels.
- **`RecentSnowChart.tsx`** — Past 14-day snowfall visualization using ComposedChart. Shows daily snowfall bars + cumulative total dashed line + faint high/low temperature lines. Dual Y-axes (snow left, temp right).

### Interactive Day Selection
- Added `selectedDayIdx` state to ResortPage (default: 0)
- Day cards are now `<button>` elements — clicking selects a day
- Selected card gets accent border glow (`.day-card--selected`)
- Selected day drives:
  - HourlySnowChart (hourly snow bars for that day)
  - HourlyDetailChart (detailed conditions for that day)
  - FreezingLevelChart (freezing level for that day)

### Reorganized Sections
1. **Snowfall Section** — Section header with 7-day total badge → interactive day cards → 7-Day Overview chart → Hourly Snow breakdown for selected day
2. **Detailed Conditions** — Hourly detail chart for the selected day
3. **Conditions Grid** — UV Index + Freezing Level side-by-side in a responsive 2-column grid
4. **Recent Snowfall** — RecentSnowChart replaces old RecentSnowTable

### CSS Updates
- Added `.day-card--selected` styles (accent border, subtle glow, background tint)
- Added hover/press transition states for day cards
- Added `.section-subtitle` for secondary headings
- Added `.resort-page__conditions-grid` (2-column on desktop, 1-column on mobile ≤768px)
- Added `.resort-page__snow-section-header` with week-total badge
- Removed all `.recent-snow__*` table styles

### Section Reordering (follow-up)
- Moved 7-Day Overview chart to be first thing after day cards
- Hourly Snow breakdown follows the overview
- Hourly detail chart is first in Detailed Conditions section

### Chart Alignment Fix (DailyForecastChart)
- Bars and temperature lines were misaligned due to side-by-side bar grouping shifting individual bars away from tick centers
- Tried `scale="point"` with `padding` — broke bar centering
- Tried `stackId` — made bars too wide and overlapping
- Final solution: `barCategoryGap="15%"` with `maxBarSize={30}` to keep bars centered and appropriately sized

---

## Phase 8: Footer & Open Source Links

- Updated footer text: "open-source" now links to `https://github.com/Ofekw/freesnow`
- Added "Submit Feedback" button linking to `https://github.com/Ofekw/freesnow/issues`
- Styled as an outlined accent pill button that fills on hover

---

## Phase 9: Copilot Workflow Guardrails

- Added `.github/copilot-instructions.md` to enforce required context loading on every task.
- Instructions now require reading both `#file:history.md` and `#file:plan.md` before decisions or code changes.
- Added a logging rule: when a task introduces a big change, update `#file:history.md` in the same task.
- Goal: keep project context usage consistent and preserve a reliable chronological implementation record.

---

## Phase 10: Fixed Scale Snow Total Graphs

### Consistent Y-Axis Scales for Snow Charts
- **DailyForecastChart**: Fixed precip Y-axis to 0–12 inches with 1-inch increments (imperial) / 0–30 cm with 5 cm increments (metric)
- **HourlyDetailChart**: Fixed precip Y-axis to 0–1 inch with 0.1-inch increments (imperial) / 0–2.5 cm with 0.5 cm increments (metric)
- **HourlySnowChart**: Fixed Y-axis to 0–1 inch with 0.1-inch increments (imperial) / 0–2.5 cm with 0.5 cm increments (metric)
- Previously all three charts used auto-scaling Y-axes, which made comparing snowfall amounts across different days or resorts difficult
- Now all snow total graphs use fixed, consistent scales so users can visually compare snowfall at a glance

### Files Changed
- `src/components/charts/DailyForecastChart.tsx` — added `domain` and `ticks` to precip YAxis
- `src/components/charts/HourlyDetailChart.tsx` — added `domain` and `ticks` to precip YAxis
- `src/components/charts/HourlySnowChart.tsx` — added `domain` and `ticks` to YAxis

---

## Phase 11: Comprehensive UI Unit Tests

### Test Infrastructure
- Switched test runner from vitest to **bun test** (bun's native test runner) — vitest v3 has Windows/bun compatibility issues with worker pools
- Installed `happy-dom`, `@happy-dom/global-registrator`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- Created `bunfig.toml` with test preload configuration
- Created `src/test/setup-bun.ts` — registers happy-dom globals, extends `expect` with jest-dom matchers, adds automatic DOM cleanup between tests
- Created separate `vitest.config.ts` (kept for reference; not actively used) alongside the existing `vite.config.ts`
- Created `src/test/test-utils.tsx` — shared `renderWithProviders()` helper wrapping all app providers (Units, Timezone, Router)

### Test Suites (116 tests across 12 files)
- **`src/utils/__tests__/weather.test.ts`** — `weatherDescription`, `fmtTemp`, `fmtElevation`, `cmToIn`, `fmtSnow` (26 tests)
- **`src/data/__tests__/favorites.test.ts`** — localStorage-based favorites CRUD: `getFavorites`, `isFavorite`, `addFavorite`, `removeFavorite`, `toggleFavorite` (11 tests)
- **`src/data/__tests__/resorts.test.ts`** — Resort catalog integrity (unique slugs, valid fields, elevation ordering), `getResortBySlug`, `searchResorts` (12 tests)
- **`src/context/__tests__/UnitsContext.test.tsx`** — Imperial/metric toggle, localStorage persistence, derived units (5 tests)
- **`src/context/__tests__/TimezoneContext.test.tsx`** — Timezone selection, persistence, `fmtDate`, `getUtcOffset`, `TZ_OPTIONS` (12 tests)
- **`src/hooks/__tests__/useFavorites.test.ts`** — Hook toggle, multi-favorite management, persistence (7 tests)
- **`src/components/__tests__/ElevationToggle.test.tsx`** — Band rendering, active state, onChange callback, elevation display (5 tests)
- **`src/components/__tests__/ResortCard.test.tsx`** — Name/region rendering, favorite star toggle, elevation stats, conditional acres (9 tests)
- **`src/components/__tests__/Layout.test.tsx`** — FAB buttons, footer attribution, feedback link (5 tests)
- **`src/pages/__tests__/HomePage.test.tsx`** — Hero section, search filtering, region grouping, no-match message, favorites section visibility (9 tests)
- **`src/pages/__tests__/ResortPage.test.tsx`** — Resort detail rendering with mocked API calls, elevation stats, toggle, refresh, favorites, 404 handling (11 tests)
- **`src/App.test.tsx`** — Route rendering, layout presence (2 tests)

### Key Technical Decisions
- Used `bun:test` instead of `vitest` — vitest v3 fails on Windows/bun due to `pathToFileURL` errors in `vite-node` worker processes and missing `port.addListener` in bun's `worker_threads`
- Used `happy-dom` + `@happy-dom/global-registrator` instead of `jsdom` — lighter and bun-native
- Dynamic imports in preload file to ensure `GlobalRegistrator.register()` runs before `@testing-library/dom` evaluates `document.body`
- Mocked `@/data/openmeteo` and `@/hooks/useWeather` in ResortPage tests via `mock.module()` to avoid real API calls

---

---

## Phase 12: PR Screenshot Generation

### Visual Regression Testing for PRs
- Added Playwright as a dev dependency for automated screenshot generation
- Created `scripts/take-screenshots.js` — Node.js script that:
  - Launches headless Chromium via Playwright
  - Takes desktop (1920x1080) and mobile (375x667) screenshots
  - Captures home page and Crystal Mountain resort detail page
  - Saves screenshots to `screenshots/` directory (gitignored)
- Updated PR CI workflow (`.github/workflows/pr-ci.yml`) to:
  - Install Playwright browsers after build
  - Start Vite preview server on port 4173
  - Run screenshot generation script
  - Upload screenshots as workflow artifacts (30-day retention)
- Added `npm run screenshots` script to `package.json`
- Screenshots help PR reviewers visually test for regressions on key pages

### Pages Captured
- Home page (main resort list with search and favorites)
- Crystal Mountain resort page (representative detail page with charts, forecasts, and interactive elements)

---

## Current File Inventory

```
src/
├── main.tsx
├── App.tsx
├── types.ts
├── components/
│   ├── Layout.tsx / Layout.css
│   ├── ResortCard.tsx / ResortCard.css
│   ├── FavoriteCard.tsx / FavoriteCard.css
│   ├── ElevationToggle.tsx / ElevationToggle.css
│   └── charts/
│       ├── DailyForecastChart.tsx
│       ├── HourlyDetailChart.tsx
│       ├── HourlySnowChart.tsx       ← NEW (Phase 7)
│       ├── RecentSnowChart.tsx       ← NEW (Phase 7)
│       ├── FreezingLevelChart.tsx
│       ├── UVIndexChart.tsx
│       └── SnowHistoryChart.tsx
├── context/
│   ├── UnitsContext.tsx
│   └── TimezoneContext.tsx
├── data/
│   ├── resorts.ts                    (31 resorts)
│   ├── openmeteo.ts
│   └── favorites.ts
├── hooks/
│   ├── useWeather.ts
│   └── useFavorites.ts
├── pages/
│   ├── HomePage.tsx / HomePage.css
│   ├── ResortPage.tsx / ResortPage.css
│   └── FavoritesPage.tsx / FavoritesPage.css  (legacy, unused)
├── utils/
│   └── weather.ts
└── styles/
```

---

## Phase 11: Frontend-Only Snow Alerts (Android PWA MVP)

### What changed
- Added a frontend-only snow alert flow using Notification API + service worker periodic background sync (best-effort, no backend).
- Added a new alerts FAB in the top-right controls so users can enable notifications and see alert status.
- Added shared IndexedDB-backed alert settings storage for service worker + app coordination (`favoriteSlugs`, timezone, threshold, enabled flag).
- Implemented service-worker periodic checks for favorited resorts and notification dispatch when forecast daily snowfall crosses the 3-inch threshold (7.62 cm).

### Why it changed
- Enables alerting for a backend-less MVP while preserving FreeSnow's core architecture (client-only data + local state).
- Provides practical Android-installed PWA support for background checks, with explicit best-effort behavior due browser/OS scheduling constraints.

### Key files affected
- `vite.config.ts` (moved PWA to `injectManifest` strategy)
- `src/sw.ts` (custom service worker: caching + periodic sync handler + notification click routing)
- `src/alerts/storage.ts`
- `src/alerts/snowAlerts.ts`
- `src/hooks/useSnowAlerts.ts`
- `src/components/Layout.tsx`
- `src/components/Layout.css`
- `src/main.tsx`
- `src/components/__tests__/Layout.test.tsx`

### Follow-up notes
- Periodic background sync cadence is controlled by Android/Chromium and is not guaranteed to run exactly morning/evening.
- Alert dedupe is per resort + forecast date to reduce repeated notifications for the same snow day.

## Phase 12: Compact 🔔 Alert Toggle

### What changed
- Replaced the wide status-label FAB ("🔔 Enable Alerts" / "🔔 Alerts On") with a compact icon-only 🔔 toggle button next to units and timezone controls.
- Added enable/disable toggle: 🔔 (on, accent background) ↔ 🔕 (off, neutral). Blocked state uses `line-through` styling.
- Extended `useSnowAlerts` hook with `enabled` state, `disableAlerts`, and `toggleAlerts` callbacks.
- Added CSS classes `.fab--alert`, `.fab--alert-on`, `.fab--alert-blocked` for visual state.
- Updated Layout and useSnowAlerts tests (now 134 tests across 15 files).

### Why it changed
- User requested a compact 🔔 icon toggle next to existing control buttons for enabling/disabling snow alerts on Android installed web app.

### Key files affected
- `src/hooks/useSnowAlerts.ts` (added `enabled`, `toggleAlerts`, `disableAlerts`, `statusIcon`)
- `src/components/Layout.tsx` (compact icon button, toggle wiring, conditional CSS classes)
- `src/components/Layout.css` (`.fab--alert`, `.fab--alert-on`, `.fab--alert-blocked`)
- `src/components/__tests__/Layout.test.tsx`
- `src/hooks/__tests__/useSnowAlerts.test.tsx` (added toggle/disable tests)

## Known Technical Notes

- **Bun PATH**: Must add `$env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"` each PowerShell session
- **Open-Meteo archive lag**: ~5 days behind. Use forecast endpoint's `past_days` for recent history.
- **Open-Meteo elevation limitation**: The `elevation` parameter only adjusts temperature via lapse rate. Precipitation data comes from the same grid cell (~11km resolution) regardless of elevation. Our snowRecalc layer fixes this.
- **Timezone handling**: All API calls pass the user's selected IANA timezone. All display formatting uses `Intl.DateTimeFormat` with that timezone.
- **PWA caching**: StaleWhileRevalidate via Workbox — serves cached response immediately, refreshes in background.

---

## Phase 13: Snowfall Recalculation & Data Accuracy Fix

### What changed
- Created `src/utils/snowRecalc.ts` — temperature-dependent snow-liquid ratio (SLR) recalculation that replaces Open-Meteo's fixed ~7:1 ratio with realistic mountain ratios (10:1 to 20:1 depending on temperature).
- Modified `src/data/openmeteo.ts` to apply recalculation at the data layer: hourly snowfall/rain are recomputed from total precipitation using freezing level + station elevation + temperature, then daily sums are recomputed from corrected hourly data.
- Fixed `src/pages/ResortPage.tsx` — Recent Snowfall section now uses the user's selected elevation band instead of always hardcoding 'mid'.
- Added `src/utils/__tests__/snowRecalc.test.ts` — 15 unit tests covering SLR, recalculation at various temperatures, and a Crystal Mountain validation scenario.

### Why it changed
Three interrelated data accuracy issues were identified:
1. **Underestimated snowfall**: Open-Meteo uses a fixed ~7:1 SLR, but real mountain snow at -7°C to -13°C has 12:1–20:1 ratios. Crystal Mountain mid showed 1.4cm when competitors showed 4–5cm.
2. **Base showing more snow than mid**: The `elevation` parameter only adjusts temperature, not precipitation. The model's rain/snow split at the grid cell level could produce more snow at base than mid due to temperature interpolation artifacts.
3. **Rain at sub-freezing temperatures**: The API's rain/snow split is computed at grid-cell elevation, not station elevation. Our recalculation uses the station's actual elevation vs freezing level to correctly categorize precipitation.

### How the recalculation works
- For each hourly data point, precipitation is re-split into snow/rain based on:
  - If station is >100m above freezing level → all snow
  - If temp ≤ 0°C → all snow  
  - If 0–2°C → linear mix
  - If > 2°C → all rain
- Snow depth is computed as `precipitation_mm × SLR` where SLR varies by temperature:
  - 0 to -2°C: 1.0 (10:1)
  - -2 to -5°C: 1.2 (12:1)
  - -5 to -10°C: 1.5 (15:1)
  - -10 to -15°C: 1.8 (18:1)
  - Below -15°C: 2.0 (20:1)
- Daily sums are recomputed from corrected hourly values

### Validation
For Crystal Mountain mid (1800m), Feb 18 2026:
- **Before**: 1.4cm (Open-Meteo raw)
- **After**: ~4.0cm (recalculated)
- **Competitors**: snow-forecast.com ~4cm, OpenSnow ~5cm

Higher elevations now correctly show ≥ snowfall of lower elevations because:
- Same precipitation amount × higher SLR at colder temperature = more snow

### Key files affected
- `src/utils/snowRecalc.ts` (new)
- `src/utils/__tests__/snowRecalc.test.ts` (new)
- `src/data/openmeteo.ts` (mapHourly/mapDaily now apply recalculation)
- `src/pages/ResortPage.tsx` (Recent Snow uses selected band)

### Follow-up notes
- The historical archive endpoint (`fetchHistorical`) still uses raw API snowfall since it doesn't return hourly data. A future improvement could add temperature-based correction for historical data too.
- Alternative free APIs (Weather.gov, multi-model averaging) were investigated but not implemented — the recalculation approach provides accurate results without additional API calls.

## Phase 13b: Rain Unit Fix in Metric Charts

### What changed
- Fixed rain unit mismatch in `DailyForecastChart` and `HourlyDetailChart`: rain values (stored in mm from the API) were displayed raw but labeled as "cm" in metric mode.
- Rain is now converted from mm → cm (`/ 10`) in metric mode to match snow on the shared precipitation Y-axis.
- Imperial mode was already correct (mm → in via `/ 25.4`).

### Why it changed
- Rain and snow share a Y-axis labeled "(cm)" in metric mode, but rain data was plotted in mm. This made rain values appear ~10x larger than they should on the cm scale (e.g., 0.65mm displayed as "0.7 cm" instead of "0.065 cm").
- Discovered while validating snowfall recalculation against live API data for Crystal Mountain WA.

### Key files affected
- `src/components/charts/DailyForecastChart.tsx`
- `src/components/charts/HourlyDetailChart.tsx`

## Status vs Plan

| Feature | Status |
|---------|--------|
| Project scaffolding (Vite + React + TS + Bun) | ✅ Complete |
| PWA (service worker, installable) | ✅ Complete |
| Dark theme + responsive CSS | ✅ Complete |
| Resort catalog (31 NA resorts) | ✅ Complete |
| Open-Meteo API integration | ✅ Complete |
| Home page (search, grouped regions) | ✅ Complete |
| Favorites (localStorage, inline on home) | ✅ Complete |
| FavoriteCard with forecast preview | ✅ Complete |
| Resort detail — header, stats, band toggle | ✅ Complete |
| 7-day day cards (interactive selection) | ✅ Complete |
| DailyForecastChart (snow/rain/temp) | ✅ Complete |
| HourlyDetailChart (72h → per-day) | ✅ Complete |
| HourlySnowChart (per-day hourly snow) | ✅ Complete |
| UV Index chart | ✅ Complete |
| Freezing Level chart | ✅ Complete |
| RecentSnowChart (past 14 days) | ✅ Complete |
| SnowHistoryChart (multi-season) | ✅ Complete |
| Imperial / Metric toggle | ✅ Complete |
| Timezone picker (13 NA zones + UTC) | ✅ Complete |
| GitHub repo link + feedback button | ✅ Complete |
| Comprehensive UI unit tests | ✅ Complete |
| PR screenshot generation | ✅ Complete |
| Snowfall recalculation (accuracy fix) | ✅ Complete |
| Map-based resort browser | 🔲 Not started |
| Global resort coverage | 🔲 Not started |
| Snow report / current conditions | 🔲 Not started |
| Webcam links | 🔲 Not started |
| Backend (accounts, alerts) | 🔲 Not started |
| Trail map overlays | 🔲 Not started |
