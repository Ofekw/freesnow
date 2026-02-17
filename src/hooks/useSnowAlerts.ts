import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useTimezone } from '@/context/TimezoneContext';
import {
  getNotificationPermission,
  isSnowAlertSupported,
  registerSnowAlertPeriodicSync,
  requestSnowAlertPermission,
  syncSnowAlertSettings,
} from '@/alerts/snowAlerts';

const SNOW_DAY_THRESHOLD_CM = 7.62;

export function useSnowAlerts() {
  const { favorites } = useFavorites();
  const { tz } = useTimezone();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermission(),
  );
  const [periodicSupported, setPeriodicSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function detectPeriodicSupport() {
      if (!isSnowAlertSupported()) {
        setPeriodicSupported(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        if (!cancelled) {
          setPeriodicSupported('periodicSync' in registration);
        }
      } catch {
        if (!cancelled) setPeriodicSupported(false);
      }
    }

    void detectPeriodicSupport();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const favoriteSlugs = favorites.map((f) => f.slug);
    void syncSnowAlertSettings({
      favoriteSlugs,
      timezone: tz,
      thresholdCm: SNOW_DAY_THRESHOLD_CM,
      enabled: permission === 'granted',
    });
  }, [favorites, permission, tz]);

  useEffect(() => {
    if (permission !== 'granted') return;
    void registerSnowAlertPeriodicSync();
  }, [permission]);

  const requestAlerts = useCallback(async () => {
    const next = await requestSnowAlertPermission();
    setPermission(next);
    if (next === 'granted') {
      await syncSnowAlertSettings({ enabled: true });
      await registerSnowAlertPeriodicSync();
    }
  }, []);

  const status = useMemo(() => {
    if (permission === 'unsupported') {
      return {
        label: '🔔 Alerts N/A',
        title: 'Notifications are not supported in this browser.',
      };
    }
    if (permission === 'denied') {
      return {
        label: '🔔 Alerts Blocked',
        title: 'Enable notifications in browser settings to receive snow alerts.',
      };
    }
    if (permission === 'granted') {
      return {
        label: periodicSupported ? '🔔 Alerts On' : '🔔 Alerts On*',
        title: periodicSupported
          ? 'Best-effort Android PWA snow alerts (about every 12 hours).'
          : 'Notifications are on. Periodic background sync is not available in this browser.',
      };
    }
    return {
      label: '🔔 Enable Alerts',
      title: 'Enable notifications for big snow-day alerts (3"+).',
    };
  }, [permission, periodicSupported]);

  return {
    permission,
    periodicSupported,
    isSupported: permission !== 'unsupported',
    statusLabel: status.label,
    statusTitle: status.title,
    requestAlerts,
  };
}