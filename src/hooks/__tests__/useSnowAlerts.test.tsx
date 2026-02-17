import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { TimezoneProvider } from '@/context/TimezoneContext';
import { useSnowAlerts } from '@/hooks/useSnowAlerts';
import { getSnowAlertSettings } from '@/alerts/storage';

const FAVORITES_KEY = 'freesnow_favorites';
const TZ_KEY = 'freesnow_tz';

let originalNotification: typeof globalThis.Notification | undefined;
let originalServiceWorker: ServiceWorkerContainer | undefined;
let originalPermissions: Permissions | undefined;
let hadNotification = false;
let hadServiceWorker = false;
let hadPermissions = false;

function wrapper({ children }: { children: React.ReactNode }) {
  return <TimezoneProvider>{children}</TimezoneProvider>;
}

function setNotification(
  permission: NotificationPermission,
  requestResult: NotificationPermission = permission,
) {
  Object.defineProperty(globalThis, 'Notification', {
    value: {
      permission,
      requestPermission: async () => requestResult,
    },
    configurable: true,
    writable: true,
  });
}

function setServiceWorker(periodicSync: object | undefined) {
  const registration = periodicSync ? { periodicSync } : {};
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve(registration) },
    configurable: true,
  });
}

function setPermissions(state: PermissionState) {
  Object.defineProperty(navigator, 'permissions', {
    value: {
      query: async () => ({ state }),
    },
    configurable: true,
  });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify([{ slug: 'vail-co', addedAt: '2026-02-16T00:00:00.000Z' }]),
  );
  localStorage.setItem(TZ_KEY, 'America/Denver');

  hadNotification = Object.prototype.hasOwnProperty.call(globalThis, 'Notification');
  hadServiceWorker = Object.prototype.hasOwnProperty.call(navigator, 'serviceWorker');
  hadPermissions = Object.prototype.hasOwnProperty.call(navigator, 'permissions');

  originalNotification = globalThis.Notification;
  originalServiceWorker = navigator.serviceWorker;
  originalPermissions = navigator.permissions;

  setNotification('default');
  setServiceWorker({});
  setPermissions('granted');
});

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

  if (hadPermissions) {
    Object.defineProperty(navigator, 'permissions', {
      value: originalPermissions,
      configurable: true,
    });
  } else {
    delete (navigator as Partial<Navigator>).permissions;
  }
});

describe('useSnowAlerts', () => {
  it('returns unsupported state when Notification API is unavailable', () => {
    delete (globalThis as Partial<typeof globalThis>).Notification;

    const { result } = renderHook(() => useSnowAlerts(), { wrapper });

    expect(result.current.permission).toBe('unsupported');
    expect(result.current.isSupported).toBe(false);
    expect(result.current.statusLabel).toBe('🔔 Alerts N/A');
    expect(result.current.enabled).toBe(false);
  });

  it('shows blocked state when permission is denied', async () => {
    setNotification('denied');

    const { result } = renderHook(() => useSnowAlerts(), { wrapper });

    await waitFor(() => {
      expect(result.current.periodicSupported).toBe(false);
    });

    expect(result.current.statusLabel).toBe('🔔 Alerts Blocked');
    expect(result.current.statusTitle).toMatch(/browser settings/i);
  });

  it('shows enabled status and marks periodic support when available', async () => {
    setNotification('granted');
    setServiceWorker({ register: async () => {} });

    const { result } = renderHook(() => useSnowAlerts(), { wrapper });

    await waitFor(() => {
      expect(result.current.periodicSupported).toBe(true);
    });

    // enabled is hydrated from persisted settings (synced on mount)
    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
    });

    expect(result.current.statusLabel).toBe('🔔 Alerts On');
    expect(result.current.statusIcon).toBe('🔔');

    const settings = await getSnowAlertSettings();
    expect(settings.favoriteSlugs).toEqual(['vail-co']);
    expect(settings.timezone).toBe('America/Denver');
    expect(settings.enabled).toBe(true);
  });

  it('shows starred enabled status when periodic sync is unavailable', async () => {
    setNotification('granted');
    setServiceWorker(undefined);

    const { result } = renderHook(() => useSnowAlerts(), { wrapper });

    await waitFor(() => {
      expect(result.current.periodicSupported).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
    });

    expect(result.current.statusLabel).toBe('🔔 Alerts On*');
    expect(result.current.statusTitle).toMatch(/not available/i);
  });

  it('requestAlerts updates permission and persists enabled setting when granted', async () => {
    setNotification('default', 'granted');

    const { result } = renderHook(() => useSnowAlerts(), { wrapper });

    await act(async () => {
      await result.current.requestAlerts();
    });

    expect(result.current.permission).toBe('granted');
    expect(result.current.enabled).toBe(true);

    const settings = await getSnowAlertSettings();
    expect(settings.enabled).toBe(true);
  });

  it('disableAlerts sets enabled to false', async () => {
    setNotification('granted');
    setServiceWorker({ register: async () => {} });

    const { result } = renderHook(() => useSnowAlerts(), { wrapper });

    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
    });

    await act(async () => {
      await result.current.disableAlerts();
    });

    expect(result.current.enabled).toBe(false);
    expect(result.current.statusIcon).toBe('🔕');
    expect(result.current.statusLabel).toBe('🔕 Alerts Off');

    const settings = await getSnowAlertSettings();
    expect(settings.enabled).toBe(false);
  });

  it('toggleAlerts enables when off and disables when on', async () => {
    setNotification('granted');
    setServiceWorker({ register: async () => {} });

    const { result } = renderHook(() => useSnowAlerts(), { wrapper });

    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
    });

    // Toggle off
    await act(async () => {
      await result.current.toggleAlerts();
    });

    expect(result.current.enabled).toBe(false);
    expect(result.current.statusIcon).toBe('🔕');

    // Toggle back on
    await act(async () => {
      await result.current.toggleAlerts();
    });

    expect(result.current.enabled).toBe(true);
    expect(result.current.statusIcon).toBe('🔔');
  });

  it('toggleAlerts shows alert message when permission is denied', async () => {
    setNotification('denied');

    const alertCalls: string[] = [];
    const origAlert = globalThis.alert;
    globalThis.alert = (msg: string) => { alertCalls.push(msg); };

    try {
      const { result } = renderHook(() => useSnowAlerts(), { wrapper });

      await act(async () => {
        await result.current.toggleAlerts();
      });

      expect(alertCalls.length).toBe(1);
      expect(alertCalls[0]).toMatch(/browser or device settings/i);
    } finally {
      globalThis.alert = origAlert;
    }
  });
});
