import { afterEach, describe, it, expect } from 'bun:test';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Layout } from '@/components/Layout';
import { renderWithProviders } from '@/test/test-utils';

describe('Layout', () => {
  const hadNotification = Object.prototype.hasOwnProperty.call(globalThis, 'Notification');
  const originalNotification = globalThis.Notification;
  const hadServiceWorker = Object.prototype.hasOwnProperty.call(navigator, 'serviceWorker');
  const originalServiceWorker = navigator.serviceWorker;

  afterEach(() => {
    if (hadNotification) {
      Object.defineProperty(globalThis, 'Notification', {
        value: originalNotification,
        configurable: true,
        writable: true,
      });
    } else {
      delete (globalThis as Partial<typeof globalThis>).Notification;
    }
    if (hadServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalServiceWorker,
        configurable: true,
      });
    } else {
      delete (navigator as Partial<Navigator>).serviceWorker;
    }
  });

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

  it('does not render the snow alerts FAB while alerts are hidden', () => {
    renderWithProviders(<Layout />);
    expect(screen.queryByLabelText(/snow alerts/i)).toBeNull();
    expect(screen.queryByLabelText(/enable snow alerts/i)).toBeNull();
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
    expect(link).toHaveAttribute('href', 'https://github.com/Ofekw/pow.fyi/issues');
  });

  it('renders the info FAB', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByLabelText(/how snowfall is calculated/i)).toBeInTheDocument();
  });

  it('shows info popover when info button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Layout />);
    const btn = screen.getByLabelText(/how snowfall is calculated/i);
    await user.click(btn);
    expect(screen.getByText('How Snowfall is Calculated')).toBeInTheDocument();
    expect(screen.getByText(/multi-model averaging/i)).toBeInTheDocument();
  });
});
