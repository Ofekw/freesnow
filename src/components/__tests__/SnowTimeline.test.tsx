import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { UnitsProvider } from '@/context/UnitsContext';
import { TimezoneProvider } from '@/context/TimezoneContext';
import { SnowTimeline } from '@/components/SnowTimeline';
import type { DailyMetrics } from '@/types';

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

function renderTimeline(recentDays: DailyMetrics[], forecastDays: DailyMetrics[]) {
  return render(
    <UnitsProvider>
      <TimezoneProvider>
        <SnowTimeline recentDays={recentDays} forecastDays={forecastDays} />
      </TimezoneProvider>
    </UnitsProvider>,
  );
}

const recentDays = [
  makeDailyMetrics('2025-01-08', 5),
  makeDailyMetrics('2025-01-09', 0),
  makeDailyMetrics('2025-01-10', 12),
  makeDailyMetrics('2025-01-11', 3),
  makeDailyMetrics('2025-01-12', 0),
  makeDailyMetrics('2025-01-13', 8),
  makeDailyMetrics('2025-01-14', 2),
];

const forecastDays = [
  makeDailyMetrics('2025-01-15', 10),
  makeDailyMetrics('2025-01-16', 15),
  makeDailyMetrics('2025-01-17', 0),
  makeDailyMetrics('2025-01-18', 5),
  makeDailyMetrics('2025-01-19', 20),
  makeDailyMetrics('2025-01-20', 0),
  makeDailyMetrics('2025-01-21', 3),
];

beforeEach(() => {
  localStorage.clear();
});

describe('SnowTimeline', () => {
  it('renders the component with accessible label', () => {
    renderTimeline(recentDays, forecastDays);
    expect(screen.getByRole('figure')).toBeInTheDocument();
  });

  it('renders the today divider', () => {
    renderTimeline(recentDays, forecastDays);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders past 7d and next 7d labels', () => {
    renderTimeline(recentDays, forecastDays);
    expect(screen.getByText('Past 7d')).toBeInTheDocument();
    expect(screen.getByText('Next 7d')).toBeInTheDocument();
  });

  it('renders totals for past and future', () => {
    renderTimeline(recentDays, forecastDays);
    // Past total: 5+0+12+3+0+8+2 = 30cm = 11.8"
    // Future total: 10+15+0+5+20+0+3 = 53cm = 20.9"
    // Verify both total values are rendered
    const { container } = renderTimeline(recentDays, forecastDays);
    const totalValues = container.querySelectorAll('.snow-timeline__total-value');
    expect(totalValues).toHaveLength(2);
  });

  it('renders 14 bar columns (7 past + 7 future)', () => {
    const { container } = renderTimeline(recentDays, forecastDays);
    const barCols = container.querySelectorAll('.snow-timeline__bar-col');
    expect(barCols).toHaveLength(14);
  });

  it('renders past bars with past style', () => {
    const { container } = renderTimeline(recentDays, forecastDays);
    const pastBars = container.querySelectorAll('.snow-timeline__bar--past');
    expect(pastBars.length).toBe(7);
  });

  it('renders future bars with future style', () => {
    const { container } = renderTimeline(recentDays, forecastDays);
    const futureBars = container.querySelectorAll('.snow-timeline__bar--future');
    expect(futureBars.length).toBe(7);
  });

  it('handles empty recent days gracefully', () => {
    renderTimeline([], forecastDays);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('handles empty forecast days gracefully', () => {
    renderTimeline(recentDays, []);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('limits to 7 past days even if more provided', () => {
    const extraPast = [
      makeDailyMetrics('2025-01-06', 1),
      makeDailyMetrics('2025-01-07', 2),
      ...recentDays,
    ];
    const { container } = renderTimeline(extraPast, forecastDays);
    const pastBars = container.querySelectorAll('.snow-timeline__bar--past');
    expect(pastBars.length).toBe(7);
  });
});
