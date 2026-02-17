import {
  getSnowAlertSettings,
  setSnowAlertSettings,
  type SnowAlertSettings,
} from '@/alerts/storage';

export const SNOW_ALERT_PERIODIC_TAG = 'freesnow-snow-alert-check';
export const SNOW_ALERT_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

interface PeriodicSyncManagerLike {
  register: (tag: string, options: { minInterval: number }) => Promise<void>;
}

interface PeriodicServiceWorkerRegistration extends ServiceWorkerRegistration {
  periodicSync?: PeriodicSyncManagerLike;
}

export function isSnowAlertSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isSnowAlertSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestSnowAlertPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isSnowAlertSupported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  return permission;
}

export async function syncSnowAlertSettings(patch: Partial<SnowAlertSettings>): Promise<void> {
  const current = await getSnowAlertSettings();
  await setSnowAlertSettings({ ...current, ...patch });
}

export async function registerSnowAlertPeriodicSync(): Promise<boolean> {
  if (!isSnowAlertSupported() || Notification.permission !== 'granted') return false;

  const ready = (await navigator.serviceWorker.ready) as PeriodicServiceWorkerRegistration;
  if (!ready.periodicSync) return false;

  try {
    if ('permissions' in navigator) {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync' as PermissionName,
      });
      if (status.state === 'denied') return false;
    }
  } catch {
    // ignore
  }

  try {
    await ready.periodicSync.register(SNOW_ALERT_PERIODIC_TAG, {
      minInterval: SNOW_ALERT_MIN_INTERVAL_MS,
    });
    return true;
  } catch {
    return false;
  }
}