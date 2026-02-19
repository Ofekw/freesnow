import { describe, it, expect, mock } from 'bun:test';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResortCard } from '@/components/ResortCard';
import { renderWithProviders } from '@/test/test-utils';
import type { Resort } from '@/types';

const mockResort: Resort = {
  slug: 'vail-co',
  name: 'Vail',
  region: 'Colorado',
  country: 'US',
  lat: 39.6403,
  lon: -106.3742,
  elevation: { base: 2475, mid: 3050, top: 3527 },
  verticalDrop: 1052,
  lifts: 31,
  acres: 5317,
  website: 'https://www.vail.com',
};

describe('ResortCard', () => {
  it('renders resort name', () => {
    renderWithProviders(
      <ResortCard resort={mockResort} isFavorite={false} onToggleFavorite={mock(() => {})} />,
    );
    expect(screen.getByText('Vail')).toBeInTheDocument();
  });

  it('renders region and country', () => {
    renderWithProviders(
      <ResortCard resort={mockResort} isFavorite={false} onToggleFavorite={mock(() => {})} />,
    );
    expect(screen.getByText('Colorado, US')).toBeInTheDocument();
  });

  it('shows filled star when favorited', () => {
    renderWithProviders(
      <ResortCard resort={mockResort} isFavorite={true} onToggleFavorite={mock(() => {})} />,
    );
    expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument();
  });

  it('shows empty star when not favorited', () => {
    renderWithProviders(
      <ResortCard resort={mockResort} isFavorite={false} onToggleFavorite={mock(() => {})} />,
    );
    expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
  });

  it('calls onToggleFavorite when star is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = mock(() => {});
    renderWithProviders(
      <ResortCard resort={mockResort} isFavorite={false} onToggleFavorite={onToggle} />,
    );

    await user.click(screen.getByLabelText('Add to favorites'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows remove label when favorited', () => {
    renderWithProviders(
      <ResortCard resort={mockResort} isFavorite={true} onToggleFavorite={mock(() => {})} />,
    );
    expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument();
  });

  it('displays elevation stats', () => {
    renderWithProviders(
      <ResortCard resort={mockResort} isFavorite={false} onToggleFavorite={mock(() => {})} />,
    );
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Top')).toBeInTheDocument();
    expect(screen.getByText('Vert')).toBeInTheDocument();
  });

  it('displays acres when available', () => {
    renderWithProviders(
      <ResortCard resort={mockResort} isFavorite={false} onToggleFavorite={mock(() => {})} />,
    );
    expect(screen.getByText('Acres')).toBeInTheDocument();
    expect(screen.getByText('5,317')).toBeInTheDocument();
  });

  it('omits acres when not available', () => {
    const resortNoAcres = { ...mockResort, acres: undefined };
    renderWithProviders(
      <ResortCard resort={resortNoAcres} isFavorite={false} onToggleFavorite={mock(() => {})} />,
    );
    expect(screen.queryByText('Acres')).not.toBeInTheDocument();
  });
});
