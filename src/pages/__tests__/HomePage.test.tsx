import { describe, it, expect, beforeEach } from 'bun:test';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from '@/pages/HomePage';
import { renderWithProviders } from '@/test/test-utils';

beforeEach(() => {
  localStorage.clear();
});

describe('HomePage', () => {
  it('renders the hero section with title', () => {
    renderWithProviders(<HomePage />);
    expect(
      screen.getByText(/free & open-source ski resort forecasts/i),
    ).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderWithProviders(<HomePage />);
    expect(
      screen.getByText(/free & open-source ski resort forecasts/i),
    ).toBeInTheDocument();
  });

  it('renders the search bar', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByPlaceholderText('Search resorts…')).toBeInTheDocument();
  });

  it('renders resort cards', () => {
    renderWithProviders(<HomePage />);
    // Vail should be listed
    expect(screen.getByText('Vail')).toBeInTheDocument();
  });

  it('groups resorts by region', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText('Colorado')).toBeInTheDocument();
    expect(screen.getByText('Utah')).toBeInTheDocument();
  });

  it('filters resorts by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'Vail');

    expect(screen.getByText('Vail')).toBeInTheDocument();
    // Stowe should be filtered out
    expect(screen.queryByText('Stowe')).not.toBeInTheDocument();
  });

  it('shows no-match message when nothing found', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'zzznotaresort');

    expect(screen.getByText(/no resorts match/i)).toBeInTheDocument();
  });

  it('does not show favorites section when none favorited', () => {
    renderWithProviders(<HomePage />);
    expect(screen.queryByText('Favourites')).not.toBeInTheDocument();
  });

  it('search has aria-label', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByLabelText('Search resorts')).toBeInTheDocument();
  });
});
