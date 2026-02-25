import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { UnitsProvider } from '@/context/UnitsContext';
import { TimezoneProvider } from '@/context/TimezoneContext';
import { MiniSnowTimeline } from '@/components/MiniSnowTimeline';
import type { DailyMetrics, HourlyMetrics } from '@/types';

function makeDailyMetrics(date: string, snowfallSum: number): DailyMetrics {
  return {
    date,
    weatherCode: 73,
    temperatureMax: -2,
    temperatureMin: -10,
    apparentTemperatureMax: -5,
    apparentTemperatureMin: -15,
    uvIndexMax: 3,
    precipitationSum: 5,
    rainSum: 0,
    snowfallSum,
    precipitationProbabilityMax: 80,
    windSpeedMax: 20,
    windGustsMax: 35,
  };
}

function makeHourlyMetrics(time: string, snowfall: number): HourlyMetrics {
  return {
    time,
    temperature: -5,
    apparentTemperature: -10,
    relativeHumidity: 80,
    precipitation: snowfall > 0 ? 2 : 0,
    rain: 0,
    snowfall,
    precipitationProbability: snowfall > 0 ? 80 : 10,
    weatherCode: snowfall > 0 ? 73 : 3,
    windSpeed: 15,
    windDirection: 270,
    windGusts: 25,
    freezingLevelHeight: 1500,
  };
}

function makeHourlyDay(date: string, amSnow: number, pmSnow: number, overnightSnow: number): HourlyMetrics[] {
  const hours: HourlyMetrics[] = [];
  for (let h = 0; h < 24; h++) {
    const hStr = h.toString().padStart(2, '0');
    let snow = 0;
    if (h >= 6 && h < 12) snow = amSnow / 6;
    else if (h >= 12 && h < 18) snow = pmSnow / 6;
    else snow = overnightSnow / 12;
    hours.push(makeHourlyMetrics(`${date}T${hStr}:00`, snow));
  }
  return hours;
}

function renderMiniTimeline(
  pastDays: DailyMetrics[],
  forecastDays: DailyMetrics[],
  forecastHourly?: HourlyMetrics[],
) {
  return render(
    <UnitsProvider>
      <TimezoneProvider>
        <MiniSnowTimeline pastDays={pastDays} forecastDays={forecastDays} forecastHourly={forecastHourly} />
      </TimezoneProvider>
    </UnitsProvider>,
  );
}

// Yesterday
const pastDays = [makeDailyMetrics('2025-01-14', 5)];

// Today + next 3 days
const forecastDays = [
  makeDailyMetrics('2025-01-15', 10),
  makeDailyMetrics('2025-01-16', 15),
  makeDailyMetrics('2025-01-17', 0),
  makeDailyMetrics('2025-01-18', 8),
];

beforeEach(() => {
  localStorage.clear();
});

describe('MiniSnowTimeline', () => {
  it('renders the component with accessible label', () => {
    renderMiniTimeline(pastDays, forecastDays);
    expect(screen.getByRole('figure')).toBeInTheDocument();
  });

  it('renders "Today" label', () => {
    renderMiniTimeline(pastDays, forecastDays);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders 5 columns total (1 yesterday + 1 today + 3 future)', () => {
    const { container } = renderMiniTimeline(pastDays, forecastDays);
    const cols = container.querySelectorAll('.mini-timeline__col');
    // 1 yesterday + 1 today (with --today modifier) + 3 future = 5
    expect(cols).toHaveLength(5);
  });

  it('renders yesterday bar with past style', () => {
    const { container } = renderMiniTimeline(pastDays, forecastDays);
    const pastBars = container.querySelectorAll('.mini-timeline__bar--past');
    expect(pastBars).toHaveLength(1);
  });

  it('renders today bar with today style when no hourly data', () => {
    const { container } = renderMiniTimeline(pastDays, forecastDays);
    const todayBar = container.querySelector('.mini-timeline__bar--today');
    expect(todayBar).toBeInTheDocument();
    expect(todayBar!.style.height).not.toBe('0%');
  });

  it('shows today snowfall value with accent style', () => {
    const { container } = renderMiniTimeline(pastDays, forecastDays);
    const todayValue = container.querySelector('.mini-timeline__value--today');
    expect(todayValue).toBeInTheDocument();
    // 10cm = 3.9" (imperial default)
    expect(todayValue!.textContent).toBe('3.9');
  });

  it('renders future bars with future style when no hourly data', () => {
    const { container } = renderMiniTimeline(pastDays, forecastDays);
    const futureBars = container.querySelectorAll('.mini-timeline__bar--future');
    // 2 future days with snow (15 and 8), 1 with 0
    expect(futureBars).toHaveLength(3);
  });

  it('handles empty past days gracefully', () => {
    const { container } = renderMiniTimeline([], forecastDays);
    expect(screen.getByText('Today')).toBeInTheDocument();
    const pastBars = container.querySelectorAll('.mini-timeline__bar--past');
    expect(pastBars).toHaveLength(0);
  });

  it('handles empty forecast days gracefully', () => {
    const { container } = renderMiniTimeline(pastDays, []);
    const cols = container.querySelectorAll('.mini-timeline__col');
    // Only yesterday
    expect(cols).toHaveLength(1);
  });

  it('only shows 3 future days even if more provided', () => {
    const extraForecast = [
      ...forecastDays,
      makeDailyMetrics('2025-01-19', 20),
      makeDailyMetrics('2025-01-20', 5),
    ];
    const { container } = renderMiniTimeline(pastDays, extraForecast);
    const cols = container.querySelectorAll('.mini-timeline__col');
    // 1 yesterday + 1 today + 3 future = 5 (not 7)
    expect(cols).toHaveLength(5);
  });

  it('only uses last past day even if more provided', () => {
    const extraPast = [
      makeDailyMetrics('2025-01-12', 3),
      makeDailyMetrics('2025-01-13', 7),
      makeDailyMetrics('2025-01-14', 5),
    ];
    const { container } = renderMiniTimeline(extraPast, forecastDays);
    const pastBars = container.querySelectorAll('.mini-timeline__bar--past');
    expect(pastBars).toHaveLength(1);
  });

  describe('AM/PM/Overnight period sub-bars', () => {
    const forecastHourly = [
      ...makeHourlyDay('2025-01-15', 3, 4, 3),  // today
      ...makeHourlyDay('2025-01-16', 6, 6, 3),  // tomorrow
      ...makeHourlyDay('2025-01-17', 0, 0, 0),  // no snow
      ...makeHourlyDay('2025-01-18', 0, 5, 3),  // some snow
    ];

    it('renders AM/PM/Overnight sub-bars for days with snow', () => {
      const { container } = renderMiniTimeline(pastDays, forecastDays, forecastHourly);
      const amBars = container.querySelectorAll('.mini-timeline__bar--am');
      const pmBars = container.querySelectorAll('.mini-timeline__bar--pm');
      const overnightBars = container.querySelectorAll('.mini-timeline__bar--overnight');
      // Cross-date overnight can make the prior day non-zero from next-day 00-05 snowfall,
      // so all four forecast days can render period bars in this fixture.
      expect(amBars.length).toBe(4);
      expect(pmBars.length).toBe(4);
      expect(overnightBars.length).toBe(4);
    });

    it('renders today with period sub-bars and accent border', () => {
      const { container } = renderMiniTimeline(pastDays, forecastDays, forecastHourly);
      const todayCol = container.querySelector('.mini-timeline__col--today');
      expect(todayCol).toBeInTheDocument();
      const todayBorder = todayCol!.querySelector('.mini-timeline__track--today-border');
      expect(todayBorder).toBeInTheDocument();
      // No old-style today bar
      const solidToday = todayCol!.querySelector('.mini-timeline__bar--today');
      expect(solidToday).not.toBeInTheDocument();
    });

    it('falls back to single bars when no forecastHourly', () => {
      const { container } = renderMiniTimeline(pastDays, forecastDays);
      const amBars = container.querySelectorAll('.mini-timeline__bar--am');
      expect(amBars).toHaveLength(0);
      const todayBar = container.querySelector('.mini-timeline__bar--today');
      expect(todayBar).toBeInTheDocument();
    });

    it('yesterday bar stays unchanged with hourly data', () => {
      const { container } = renderMiniTimeline(pastDays, forecastDays, forecastHourly);
      const pastBars = container.querySelectorAll('.mini-timeline__bar--past');
      expect(pastBars).toHaveLength(1);
    });
  });
});
