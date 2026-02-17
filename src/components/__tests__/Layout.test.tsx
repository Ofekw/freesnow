import { afterEach, describe, it, expect } from 'bun:test';
import { screen } from '@testing-library/react';
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

  it('disables the snow alerts FAB when notifications are not supported', () => {
    renderWithProviders(<Layout />);
    const btn = screen.getByLabelText(/enable snow alerts/i);
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('renders the snow alerts FAB enabled when notifications are supported', () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'default', requestPermission: async () => 'default' },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({}) },
      configurable: true,
    });
    renderWithProviders(<Layout />);
    const btn = screen.getByLabelText(/enable snow alerts/i);
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
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
