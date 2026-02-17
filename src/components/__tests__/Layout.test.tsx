import { describe, it, expect } from 'bun:test';
import { screen } from '@testing-library/react';
import { Layout } from '@/components/Layout';
import { renderWithProviders } from '@/test/test-utils';

describe('Layout', () => {
  it('renders the units toggle FAB', () => {
    renderWithProviders(<Layout />);
    // Imperial default — shows °F / ft
    expect(
      screen.getByLabelText(/switch to metric units/i),
    ).toBeInTheDocument();
  });

  it('renders the timezone FAB', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByLabelText(/change timezone/i)).toBeInTheDocument();
  });

  it('renders the snow alerts FAB with enable label when alerts are off', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByLabelText(/enable snow alerts/i)).toBeInTheDocument();
  });

  it('renders footer with Open-Meteo attribution', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText(/open-meteo/i)).toBeInTheDocument();
  });

  it('renders footer with open-source link', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText(/open-source/i)).toBeInTheDocument();
  });

  it('renders Submit Feedback link', () => {
    renderWithProviders(<Layout />);
    const link = screen.getByText('Submit Feedback');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://github.com/Ofekw/freesnow/issues');
  });
});
