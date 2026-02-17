import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  SNOW_ALERT_MIN_INTERVAL_MS,
  SNOW_ALERT_PERIODIC_TAG,
  getNotificationPermission,
  registerSnowAlertPeriodicSync,
  requestSnowAlertPermission,
  syncSnowAlertSettings,
} from '@/alerts/snowAlerts';
import { getSnowAlertSettings, setSnowAlertSettings } from '@/alerts/storage';

type MockNotification = {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
};

let originalNotification: typeof globalThis.Notification | undefined;
let originalServiceWorker: ServiceWorkerContainer | undefined;
let originalPermissions: Permissions | undefined;
let hadNotification = false;
let hadServiceWorker = false;
let hadPermissions = false;

function setMockNotification(notification: MockNotification) {
  Object.defineProperty(globalThis, 'Notification', {
    value: notification,
    configurable: true,
    writable: true,
  });
}

function setMockServiceWorker(registration: unknown) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve(registration) },
    configurable: true,
  });
}

function setMockPermissions(state: PermissionState) {
  Object.defineProperty(navigator, 'permissions', {
    value: {
      query: mock(async () => ({ state })),
    },
    configurable: true,
  });
}

beforeEach(() => {
  localStorage.clear();
  hadNotification = Object.prototype.hasOwnProperty.call(globalThis, 'Notification');
  hadServiceWorker = Object.prototype.hasOwnProperty.call(navigator, 'serviceWorker');
  hadPermissions = Object.prototype.hasOwnProperty.call(navigator, 'permissions');
  originalNotification = globalThis.Notification;
  originalServiceWorker = navigator.serviceWorker;
  originalPermissions = navigator.permissions;
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

describe('snowAlerts', () => {
  it('returns unsupported permission when Notification API is unavailable', () => {
    delete (globalThis as Partial<typeof globalThis>).Notification;

    expect(getNotificationPermission()).toBe('unsupported');
  });

  it('requests notification permission via Notification API', async () => {
    const requestPermission = mock(async () => 'granted' as NotificationPermission);
    setMockNotification({ permission: 'default', requestPermission });
    setMockServiceWorker({});

    const permission = await requestSnowAlertPermission();
    expect(permission).toBe('granted');
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('merges patches into persisted snow alert settings', async () => {
    await setSnowAlertSettings({
      favoriteSlugs: ['vail-co'],
      timezone: 'America/Denver',
      thresholdCm: 7.62,
      enabled: false,
    });

    await syncSnowAlertSettings({ enabled: true });
    const settings = await getSnowAlertSettings();

    expect(settings).toEqual({
      favoriteSlugs: ['vail-co'],
      timezone: 'America/Denver',
      thresholdCm: 7.62,
      enabled: true,
    });
  });

  it('returns false when permission is not granted', async () => {
    setMockNotification({
      permission: 'default',
      requestPermission: mock(async () => 'default' as NotificationPermission),
    });
    setMockServiceWorker({ periodicSync: { register: mock(async () => {}) } });

    expect(await registerSnowAlertPeriodicSync()).toBe(false);
  });

  it('registers periodic sync when supported and allowed', async () => {
    const register = mock(async () => {});
    setMockNotification({
      permission: 'granted',
      requestPermission: mock(async () => 'granted' as NotificationPermission),
    });
    setMockPermissions('granted');
    setMockServiceWorker({ periodicSync: { register } });

    const ok = await registerSnowAlertPeriodicSync();

    expect(ok).toBe(true);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(SNOW_ALERT_PERIODIC_TAG, {
      minInterval: SNOW_ALERT_MIN_INTERVAL_MS,
    });
  });

  it('returns false when periodic background sync permission is denied', async () => {
    const register = mock(async () => {});
    setMockNotification({
      permission: 'granted',
      requestPermission: mock(async () => 'granted' as NotificationPermission),
    });
    setMockPermissions('denied');
    setMockServiceWorker({ periodicSync: { register } });

    const ok = await registerSnowAlertPeriodicSync();

    expect(ok).toBe(false);
    expect(register).toHaveBeenCalledTimes(0);
  });
});