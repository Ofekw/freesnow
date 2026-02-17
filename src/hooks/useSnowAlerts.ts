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
  const [enabled, setEnabled] = useState(permission === 'granted');

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
      enabled,
    });
  }, [favorites, tz, enabled]);

  useEffect(() => {
    if (permission !== 'granted') return;
    void registerSnowAlertPeriodicSync();
  }, [permission]);

  const requestAlerts = useCallback(async () => {
    const next = await requestSnowAlertPermission();
    setPermission(next);
    if (next === 'granted') {
      setEnabled(true);
      await syncSnowAlertSettings({ enabled: true });
      await registerSnowAlertPeriodicSync();
    }
  }, []);

  const disableAlerts = useCallback(async () => {
    setEnabled(false);
    await syncSnowAlertSettings({ enabled: false });
  }, []);

  const toggleAlerts = useCallback(async () => {
    if (permission === 'unsupported' || permission === 'denied') return;
    if (permission !== 'granted') {
      await requestAlerts();
      return;
    }
    if (enabled) {
      await disableAlerts();
    } else {
      setEnabled(true);
      await syncSnowAlertSettings({ enabled: true });
      await registerSnowAlertPeriodicSync();
    }
  }, [permission, enabled, requestAlerts, disableAlerts]);

  const status = useMemo(() => {
    if (permission === 'unsupported') {
      return {
        icon: '🔔',
        label: '🔔 Alerts N/A',
        title: 'Notifications are not supported in this browser.',
      };
    }
    if (permission === 'denied') {
      return {
        icon: '🔕',
        label: '🔔 Alerts Blocked',
        title: 'Enable notifications in browser settings to receive snow alerts.',
      };
    }
    if (permission === 'granted' && enabled) {
      return {
        icon: '🔔',
        label: periodicSupported ? '🔔 Alerts On' : '🔔 Alerts On*',
        title: periodicSupported
          ? 'Snow alerts on — best-effort check about every 12 hours.'
          : 'Snow alerts on. Periodic background sync is not available in this browser.',
      };
    }
    if (permission === 'granted' && !enabled) {
      return {
        icon: '🔕',
        label: '🔕 Alerts Off',
        title: 'Snow alerts paused. Tap to re-enable.',
      };
    }
    return {
      icon: '🔔',
      label: '🔔 Enable Alerts',
      title: 'Enable notifications for big snow-day alerts (3"+).',
    };
  }, [permission, periodicSupported, enabled]);

  return {
    permission,
    periodicSupported,
    enabled,
    isSupported: permission !== 'unsupported',
    statusIcon: status.icon,
    statusLabel: status.label,
    statusTitle: status.title,
    requestAlerts,
    disableAlerts,
    toggleAlerts,
  };
}