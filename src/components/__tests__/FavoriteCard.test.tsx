import { describe, it, expect, beforeEach, afterAll, mock } from 'bun:test';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTimezone } from '@/context/TimezoneContext';
import { renderWithProviders } from '@/test/test-utils';
import type { DailyMetrics, Resort } from '@/types';

function makeDefaultForecast() {
  return {
    band: 'mid' as const,
    elevation: 3050,
    hourly: [],
    daily: [
      makeDaily('2025-01-18', -2, -10, 1),
      makeDaily('2025-01-19', -1, -9, 2),
      makeDaily('2025-01-20', 0, -8, 3),
      makeDaily('2025-01-21', 1, -7, 4),
      makeDaily('2025-01-22', 2, -6, 5),
      makeDaily('2025-01-23', 3, -5, 6),
      makeDaily('2025-01-24', 4, -4, 7),
      makeDaily('2025-01-25', 5, -3, 8),
      makeDaily('2025-01-26', 6, -2, 9),
    ],
  };
}

const fetchMultiModelForecastMock = mock(() => Promise.resolve(makeDefaultForecast()));

const todayIsoInTimezoneMock = mock((tz: string) => {
  if (tz === 'America/Los_Angeles') return '2025-01-19';
  return '2025-01-20';
});

mock.module('@/data/openmeteo', () => ({
  fetchForecast: fetchMultiModelForecastMock,
  fetchHistorical: mock(async () => []),
  fetchMultiModelForecast: fetchMultiModelForecastMock,
}));

mock.module('@/utils/dateKey', () => ({
  todayIsoInTimezone: todayIsoInTimezoneMock,
}));

const { FavoriteCard } = await import('@/components/FavoriteCard');

function makeDaily(date: string, temperatureMax: number, temperatureMin: number, snowfallSum: number): DailyMetrics {
  return {
    date,
    weatherCode: 73,
    temperatureMax,
    temperatureMin,
    apparentTemperatureMax: temperatureMax,
    apparentTemperatureMin: temperatureMin,
    uvIndexMax: 3,
    precipitationSum: snowfallSum,
    rainSum: 0,
    snowfallSum,
    precipitationProbabilityMax: 70,
    windSpeedMax: 20,
    windGustsMax: 30,
  };
}

const resort: Resort = {
  slug: 'vail-co',
  name: 'Vail',
  region: 'Colorado',
  country: 'CA',
  lat: 39.6403,
  lon: -106.3742,
  elevation: { base: 2475, mid: 3050, top: 3527 },
  verticalDrop: 1052,
};

function FavoriteCardTestHarness() {
  const { setTz } = useTimezone();
  return (
    <>
      <button onClick={() => setTz('America/Los_Angeles')}>Set PT</button>
      <FavoriteCard resort={resort} onToggleFavorite={() => {}} />
    </>
  );
}

function renderFavoriteCardHarness() {
  return renderWithProviders(<FavoriteCardTestHarness />);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('pow_tz', 'UTC');
  fetchMultiModelForecastMock.mockImplementation(() => Promise.resolve(makeDefaultForecast()));
  todayIsoInTimezoneMock.mockClear();
});

afterAll(() => {
  mock.restore();
});

describe('FavoriteCard timezone behavior', () => {
  it('requests a 2-day forecast on the past-data fetch as tomorrow fallback', async () => {
    renderFavoriteCardHarness();
    await screen.findByText('Tomorrow');

    const calledWithPastFallback = fetchMultiModelForecastMock.mock.calls.some(
      (call) => call[5] === 2 && call[6] === 14,
    );
    expect(calledWithPastFallback).toBe(true);
  });

  it('shows a 5-day mini timeline window (yesterday + today + next 3)', async () => {
    const { container } = renderFavoriteCardHarness();
    await screen.findByText('Tomorrow');
    const cols = container.querySelectorAll('.mini-timeline__col');
    expect(cols).toHaveLength(5);
  });

  it('re-splits days correctly when user switches timezone', async () => {
    const user = userEvent.setup();
    renderFavoriteCardHarness();

    await screen.findByText('Tomorrow');

    // UTC mocked "today" = 2025-01-20, so tomorrow is 2025-01-21
    expect(screen.getByText('19°F / 34°F')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Set PT' }));

    // PT mocked "today" = 2025-01-19, so tomorrow is 2025-01-20
    await waitFor(() => {
      expect(screen.getByText('18°F / 32°F')).toBeInTheDocument();
    });

    expect(todayIsoInTimezoneMock).toHaveBeenCalledWith('UTC');
    expect(todayIsoInTimezoneMock).toHaveBeenCalledWith('America/Los_Angeles');
  });
});
