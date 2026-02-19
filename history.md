# Free OpenSnow — Implementation History

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

---

## Phase 14: UI/UX Overhaul — Phase 1 (Design System & ECharts Migration)

### What changed
- **Chart library migration**: Replaced Recharts with Apache ECharts 6 + echarts-for-react 3.0.6. All 7 chart components fully rewritten.
- **Design tokens overhaul**: New deeper navy Grafana-inspired palette (`--color-bg: #0b1120`, `--color-surface: #141b2d`, `--color-surface-raised: #1e2942`), semantic chart color tokens (`--chart-snow`, `--chart-rain`, `--chart-temp-high`, etc.), glow shadows.
- **Typography**: Added DM Sans (display/UI) and Space Mono (data/mono) via Google Fonts.
- **ECharts theme system**: Created centralized `echarts-theme.ts` with registered 'freesnow' theme and builder helpers (`makeTooltip`, `makeLegend`, `makeGrid`, `makeCategoryAxis`, `makeValueAxis`, `makeBarSeries`, `makeLineSeries`, `makeDashedLineSeries`, `makeDataZoom`).
- **BaseChart wrapper**: New `BaseChart.tsx` thin wrapper applying theme, responsive sizing, optional cross-chart group sync.
- **Chart feature improvements**:
  - All charts now have toggleable legends (ECharts native)
  - DailyForecastChart & HourlyDetailChart: dual Y-axes, feels-like dashed lines
  - HourlyDetailChart: wind speed + gusts now rendered (previously computed but hidden)
  - HourlySnowChart: precipitation probability now rendered as dotted line
  - RecentSnowChart: proper legend + dataZoom slider for panning
  - FreezingLevelChart: gradient fill + optional resort elevation markLine reference
  - UVIndexChart: color-coded severity legend, value labels on bars, timezone-aware date formatting
  - SnowHistoryChart: **bug fix** — now respects units context (was hardcoded to imperial)

### Why it changed
- UI/UX overhaul initiative for powder hunters — needed interactive Grafana-style charts with toggleable legends, uniform increments, rich tooltips, and dataZoom for exploration.
- Recharts lacked native legend toggling, dataZoom, cross-chart sync, and built-in dark theme support.
- Typography and color palette refresh to establish unique brand identity distinct from competitors (OpenSnow, snow-forecast.com).

### Key files affected
- `package.json` — echarts deps added, recharts removed
- `index.html` — Google Fonts links, updated title/theme-color
- `src/styles/index.css` — full design token overhaul
- `src/components/charts/echarts-theme.ts` — NEW: theme + helpers
- `src/components/charts/BaseChart.tsx` — NEW: wrapper component
- `src/components/charts/DailyForecastChart.tsx` — rewritten
- `src/components/charts/HourlyDetailChart.tsx` — rewritten
- `src/components/charts/HourlySnowChart.tsx` — rewritten
- `src/components/charts/RecentSnowChart.tsx` — rewritten
- `src/components/charts/FreezingLevelChart.tsx` — rewritten
- `src/components/charts/UVIndexChart.tsx` — rewritten
- `src/components/charts/SnowHistoryChart.tsx` — rewritten
- `src/pages/ResortPage.tsx` — added resortElevation prop to FreezingLevelChart

---

## Phase 15: UI/UX Overhaul — Phase 2 (Snow Timeline, Conditions Summary, Resort Page Restructure)

### What changed
- **SnowTimeline component** — OpenSnow-inspired compact past 7 + future 7 day snowfall bar chart with "today" divider. Shows at-a-glance snow trend with totals for each period. Uses CSS bars with gradient fill (future) vs muted (past). Placed in hero position on resort page.
- **ConditionsSummary component** — snow-forecast.com-inspired 3-elevation comparison table for the selected day. Shows weather, temperature (high/low), snow, rain, wind (+ gusts), precipitation probability, and average freezing level across Base/Mid/Top bands. Uses CSS grid layout with responsive design.
- **ResortPage restructure** — New information hierarchy:
  1. Header + stats (unchanged)
  2. **Snow Timeline** (hero position — first data the user sees)
  3. Band toggle + refresh
  4. **Conditions Summary** (all-elevation at-a-glance, with "All Elevations" badge)
  5. 7-Day Snow section (day cards + DailyForecastChart + HourlySnowChart)
  6. Hourly Detail chart
  7. UV + Freezing Level grid
  8. Recent Snowfall
- **CSS polish** — Section header with badge component, stats row uses `font-mono` for data values, updated border/radius tokens.
- **20 new tests** — 10 for SnowTimeline (rendering, data display, edge cases, accessibility), 10 for ConditionsSummary (table structure, elevation bands, weather data display, unit formatting).

### Why it changed
- Powder hunters need an instant visual read on the snow trend — the SnowTimeline gives this at a glance before any scrolling.
- Comparing conditions across elevations (snow-forecast.com style) helps users decide which lifts to target.
- Previous layout showed only the selected elevation band's conditions; now the ConditionsSummary shows all three bands simultaneously.

### Key files affected
- `src/components/SnowTimeline.tsx` — NEW
- `src/components/SnowTimeline.css` — NEW
- `src/components/ConditionsSummary.tsx` — NEW
- `src/components/ConditionsSummary.css` — NEW
- `src/components/__tests__/SnowTimeline.test.tsx` — NEW (10 tests)
- `src/components/__tests__/ConditionsSummary.test.tsx` — NEW (10 tests)
- `src/pages/ResortPage.tsx` — restructured layout + new component integration
- `src/pages/ResortPage.css` — section header badge, stat font-mono, border updates

---

## Phase 16: UI/UX Overhaul — Phase 4 (Polish + Animations)

### What changed
- **Global animation system** — Added 6 `@keyframes` to `index.css`: `fadeInUp`, `fadeIn`, `slideInLeft`, `shimmer`, `pulseGlow`, `snowPulse`. Utility classes `.animate-fade-in-up`, `.animate-fade-in`, `.stagger-children` (10-step delay). Smooth scroll via `html { scroll-behavior: smooth }`. Full `prefers-reduced-motion: reduce` media query disables all animations/transitions for accessibility.
- **Skeleton loading states** — Replaced plain "Loading forecast…" text with shimmer skeleton placeholders (`.skeleton`, `.skeleton--text`, `.skeleton--chart`, `.skeleton--card`). Applied to FavoriteCard loading state (3-column skeleton grid) and ResortPage initial loader (chart + text skeletons).
- **Cross-chart tooltip sync** — BaseChart now calls `echarts.connect(group)` when a group prop is provided, enabling synchronized tooltips and dataZoom across charts sharing the same group ID. HourlyDetailChart, HourlySnowChart, and FreezingLevelChart each already pass group IDs.
- **Section title accent** — `.section-title` now has a 3px left border accent (`border-left: 3px solid var(--color-accent)`) for visual hierarchy.
- **Day card animations** — Day cards use `fadeInUp` entrance with stagger delays via `.stagger-children`. Added `:active` press state (`scale(0.97)`). Enhanced selected state with stronger box-shadow and inset glow.
- **Card hover polish** — ResortCard and FavoriteCard hover states now include subtle accent border glow (`border-color: rgba(56, 189, 248, 0.15/0.2)`) and enhanced shadow. FavoriteCard snow values get `snowPulse` animation for subtle text glow.
- **HomePage polish** — Search input gets cyan focus ring + glow shadow. Hero section, region sections animate in with `fadeInUp`. Region titles get left accent border. Favorites section gets ambient glow on hover.
- **Scroll-to-top button** — New floating button (bottom-right) appears when scrolled past 400px. Pill shape, accent hover, smooth reveal animation. Responsive sizing on mobile.
- **FAB group polish** — FABs get enhanced hover shadow (`box-shadow: 0 4px 16px rgba(56, 189, 248, 0.25)`). Favorite star on ResortPage gets `pulseGlow` when active.
- **ElevationToggle polish** — Active state gets inset glow (`box-shadow: inset 0 0 12px rgba(56, 189, 248, 0.15)`).
- **SnowTimeline + ConditionsSummary** — Both components get `fadeInUp` entrance animation.
- **Focus visible** — Global `:focus-visible` ring (`2px solid var(--color-accent), offset 2px`) for keyboard accessibility.
- **Bug fix** — Fixed typo `"reso  rt-page__chart-block"` → `"resort-page__chart-block"` in ResortPage.tsx.

### Why it changed
- Animations provide visual feedback, guide attention to new data, and make the UI feel more responsive/alive.
- Skeleton loading states are a modern UX pattern that reduces perceived wait time vs. plain text spinners.
- Cross-chart sync lets users correlate data across multiple hourly charts simultaneously.
- Accessibility requirements demand motion reduction support and visible focus states.

### Key files affected
- `src/styles/index.css` — Global animations, skeletons, focus, reduced motion
- `src/pages/ResortPage.tsx` — Skeleton loader, animation classes, stagger, typo fix
- `src/pages/ResortPage.css` — Section accent, day card animations, stats hover, skeleton section
- `src/pages/HomePage.css` — Search glow, hero animation, region title accent, favorites hover
- `src/components/FavoriteCard.tsx` — Skeleton loading state
- `src/components/FavoriteCard.css` — Skeleton grid, snow pulse, card hover glow
- `src/components/ResortCard.css` — Card entrance animation, hover border glow
- `src/components/Layout.tsx` — Scroll-to-top button (state + JSX)
- `src/components/Layout.css` — Scroll-to-top styles, FAB hover shadow
- `src/components/ElevationToggle.css` — Active inset glow
- `src/components/SnowTimeline.css` — Entrance animation
- `src/components/ConditionsSummary.css` — Entrance animation
- `src/components/charts/BaseChart.tsx` — `echarts.connect()` for cross-chart sync

## Snow Data Accuracy Improvement — Multi-Model, SLR, NWS, Snow Depth

### What changed
- **Phase A: Multi-model averaging** — The primary forecast now fetches 3 weather models in parallel (GFS, ECMWF IFS, and HRRR for US / GEM for Canada) and averages their raw output before applying the SLR recalculation. Precipitation uses **median** (robust to outlier model spikes), temperature/wind/humidity use **mean**, weather codes use **mode**, and wind direction uses vector averaging. Different time ranges are handled via union (HRRR 48h contributes only to short-range, GFS/ECMWF cover full 7 days). Falls back to single `best_match` if all model fetches fail.
- **Phase B: Improved SLR** — `snowLiquidRatio()` now accepts optional `relativeHumidity` and `windSpeedKmh` parameters. High humidity (≥80%) boosts SLR by 10-15% (fluffier dendritic crystals), low humidity (<50%) reduces by 10% (denser granular snow). Strong wind (≥30 km/h) reduces by 10-20% (compaction + sublimation). `recalcHourly` passes humidity and wind from the API data.
- **Phase C: NWS cross-reference** — For US resorts, `fetchNWSSnowfall()` queries the NWS Weather.gov API (free, no key, CORS) via a 2-step lookup (points → gridpoint forecastGridData → snowfallAmount). NWS forecaster-adjusted snowfall is blended with multi-model output at 30% NWS / 70% model weight. NWS failures are silently ignored (optional enhancement).
- **Phase D: Snow depth** — Added `snow_depth` to hourly API variables. `HourlyMetrics` now includes optional `snowDepth` field. Model averaging handles `snow_depth` arrays when present.
- **Service worker** — Added `StaleWhileRevalidate` caching for `api.weather.gov` origin.

### Why it changed
The plan identified four independent accuracy improvements, all achievable with free APIs and no backend:
1. Multi-model averaging is the single highest-impact technique for forecast accuracy (15-30% RMSE reduction).
2. Humidity and wind are already fetched but weren't used in SLR — adding them corrects the fluffiness/compaction mismatch.
3. NWS forecasters manually adjust QPF and snow ratios — their signal adds human intelligence to the pipeline.
4. Snow depth provides validation data and future UI opportunities.

### Key files affected
- `src/utils/modelAverage.ts` — NEW: `mean`, `median`, `averageHourlyArrays`, `averageDailyArrays`, `blendWithNWS`, `modelsForCountry`
- `src/utils/__tests__/modelAverage.test.ts` — NEW: 22 tests
- `src/data/nws.ts` — NEW: `fetchNWSGridpoint`, `fetchNWSSnowfall`, `nwsToSnowMap`
- `src/data/__tests__/nws.test.ts` — NEW: 3 tests
- `src/utils/snowRecalc.ts` — `snowLiquidRatio` upgraded with humidity + wind; `RecalcHourlyInput` extended
- `src/utils/__tests__/snowRecalc.test.ts` — 13 new tests for humidity/wind/combined SLR + recalcHourly with inputs
- `src/data/openmeteo.ts` — `OMForecastResponse` exported; `snow_depth` added to hourly vars/types; `mapHourly` passes humidity/wind to `recalcHourly`; `fetchMultiModelForecast` added
- `src/hooks/useWeather.ts` — `useForecast` now uses multi-model + NWS blending pipeline
- `src/types.ts` — `HourlyMetrics.snowDepth` added (optional)
- `src/sw.ts` — NWS API caching route added

### API call budget
- Previous: 3 calls/resort (3 bands × 1 model)
- Now: 9 calls/resort for Open-Meteo (3 bands × 3 models) + 2 for NWS (US only) = 11 max
- Well within 10,000/day free tier (≥900 resort views/day)

### Test impact
- 215 tests across 21 files (up from ~177), all passing

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
| Multi-model averaging (accuracy improvement) | ✅ Complete |
| Improved SLR (humidity + wind) | ✅ Complete |
| NWS cross-reference (US resorts) | ✅ Complete |
| Snow depth variable | ✅ Complete |
| UI/UX Phase 2 — Snow Timeline + Conditions + Resort restructure | ✅ Complete |
| UI/UX Phase 4 — Polish + Animations | ✅ Complete |
| UI/UX Phase 5 — Icons, Snowpack, Mobile Fixes | ✅ Complete |
| Map-based resort browser | 🔲 Not started |
| Global resort coverage | 🔲 Not started |
| Snow report / current conditions | 🔲 Not started |
| Webcam links | 🔲 Not started |
| Backend (accounts, alerts) | 🔲 Not started |
| Trail map overlays | 🔲 Not started |

---

## Phase 17: UI/UX Phase 5 — Icons, Snowpack, Mobile Fixes

### What changed

**1. Emoji → Lucide Icon Pack Migration**
- Replaced all emoji usage across the app with [Lucide React](https://lucide.dev/) SVG icons for cross-platform consistency.
- Created `src/components/icons.tsx` — `WeatherIcon` component mapping WMO weather icon IDs (e.g., `'sun'`, `'cloud-snow'`, `'snowflake'`) to Lucide SVG components.
- Updated `src/utils/weather.ts` — `WMO_MAP` now returns icon ID strings (e.g., `'sun'` instead of `'☀️'`) for all 28 WMO weather codes.
- All section titles, row labels, UI controls, and weather displays now render uniform SVG icons:
  - Section titles: `<Snowflake>`, `<BarChart3>`, `<Clock>`, `<Sun>`, `<Thermometer>`, `<TrendingUp>`
  - Conditions table labels: `<Snowflake>` Snow, `<CloudRain>` Rain, `<Wind>` Wind, `<Droplets>` Precip %, `<Thermometer>` Freeze lvl
  - UI controls: `<Star>` favorites, `<Globe>` timezone, `<Bell>`/`<BellOff>` alerts, `<ChevronUp>` scroll-to-top, `<RefreshCw>` refresh, `<AlertTriangle>` errors, `<Layers>` snowpack
- Updated global CSS: SVG elements no longer forced to `display: block`; FAB buttons use `display: inline-flex` for proper icon+text alignment.

**2. Favourites Icon Placement Fix**
- Moved the favourite star from a floating right-side position to inline with the resort name (`resort-page__title-row` flex row).
- Star is now directly next to the resort name and never overlaps with the FAB control group.
- Reduced header `padding-right` from 260px/210px to 180px/140px since the star no longer needs its own space.
- Uses Lucide `<Star>` with `fill="currentColor"` for active state, `fill="none"` for inactive.

**3. SnowTimeline Mobile Overflow Fix**
- Added `overflow-x: auto` with `-webkit-overflow-scrolling: touch` to the chart container.
- Changed section flex from `flex: 1` to `flex: 1 0 auto` so bars maintain minimum width and scroll instead of compressing.
- Reduced bar label font sizes on mobile (0.58rem) for denser layout before scroll kicks in.

**4. Snowpack / Snow Depth Information**
- Added a "Snowpack" stat to the quick stats row (next to Lifts, Acres) showing the current estimated snow depth for the selected elevation band, with `<Layers>` icon. Displayed in imperial (inches) or metric (cm).
- Added a "Snowpack" row to the ConditionsSummary table showing snow depth across all three elevation bands (Base/Mid/Top).
- Snow depth is computed as the max `snowDepth` value from the hourly data for the selected day, converted from meters to cm.

### Why it changed
- Emojis render differently across platforms (Windows, macOS, Android, iOS) causing inconsistent UX. SVG icons from Lucide are pixel-identical everywhere.
- The favourite star was awkwardly floating on the right side of the header, disconnected from the resort name, and could be covered by the fixed FAB buttons on narrow screens.
- SnowTimeline's 14 bars overflowed on mobile screens (<375px) because bars had min-width constraints that exceeded viewport width.
- Snow depth (snowpack) data was already fetched from the API but not displayed anywhere — powder hunters need to know base depth to assess conditions.

### Key files affected
- `src/components/icons.tsx` — NEW: WeatherIcon component
- `src/utils/weather.ts` — WMO icon IDs changed from emojis to string identifiers
- `src/components/Layout.tsx` — Lucide icons for globe, bell, chevron
- `src/components/Layout.css` — FAB `display: inline-flex`
- `src/pages/ResortPage.tsx` — All section icons, fav inline with name, snowpack stat
- `src/pages/ResortPage.css` — Title-row flex, section-title flex+icon styles, snowpack stat
- `src/pages/HomePage.tsx` — Lucide Snowflake + Star icons
- `src/pages/HomePage.css` — Icon alignment styles
- `src/components/ResortCard.tsx` — Lucide Star icon
- `src/components/FavoriteCard.tsx` — Lucide Star + WeatherIcon
- `src/components/ConditionsSummary.tsx` — All row label icons + snowpack depth row
- `src/components/ConditionsSummary.css` — Label icon styling + snowpack cell
- `src/components/SnowTimeline.css` — overflow-x: auto, responsive font sizes
- `src/styles/index.css` — SVG display rule updated
- `src/components/ResortCard.css` — Fav button flex alignment
- `src/components/FavoriteCard.css` — Tomorrow weather icon flex, fav button flex
- Test files updated: weather.test.ts, ConditionsSummary.test.tsx, ResortCard.test.tsx, HomePage.test.tsx, ResortPage.test.tsx

### Test impact
- 215 tests across 21 files, all passing (0 new tests needed — existing tests updated for icon string changes)
