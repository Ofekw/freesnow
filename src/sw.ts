/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { fetchForecast } from './data/openmeteo';
import { getResortBySlug } from './data/resorts';
import {
  getSnowAlertNotifiedMap,
  getSnowAlertSettings,
  setSnowAlertNotifiedMap,
} from './alerts/storage';
import { cmToIn } from './utils/weather';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    url: string;
    revision: string | null;
  }>;
};

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  ({ url }) => url.origin === 'https://api.open-meteo.com',
  new StaleWhileRevalidate({ cacheName: 'open-meteo-cache' }),
);

registerRoute(
  ({ url }) => url.origin === 'https://api.weather.gov',
  new StaleWhileRevalidate({ cacheName: 'nws-cache' }),
);

function formatDateLabel(dateIso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: timezone || undefined,
    }).format(new Date(dateIso));
  } catch {
    return dateIso;
  }
}

async function runSnowAlertCheck() {
  if (Notification.permission !== 'granted') return;

  const settings = await getSnowAlertSettings();
  if (!settings.enabled || settings.favoriteSlugs.length === 0) return;

  const notifiedMap = await getSnowAlertNotifiedMap();
  let hasChanges = false;

  for (const slug of settings.favoriteSlugs) {
    const resort = getResortBySlug(slug);
    if (!resort) continue;

    try {
      const forecast = await fetchForecast(
        resort.lat,
        resort.lon,
        resort.elevation.mid,
        'mid',
        3,
        0,
        settings.timezone || 'auto',
      );

      const nextSnowDay = forecast.daily.find((day) => day.snowfallSum >= settings.thresholdCm);
      if (!nextSnowDay) continue;

      if (notifiedMap[slug] === nextSnowDay.date) continue;

      const inches = cmToIn(nextSnowDay.snowfallSum).toFixed(1);
      const dayLabel = formatDateLabel(nextSnowDay.date, settings.timezone);
      const thresholdInches = cmToIn(settings.thresholdCm).toFixed(1);

      await self.registration.showNotification(`❄️ ${resort.name}: ${inches}" forecast`, {
        body: `${dayLabel} at ${resort.name} is forecasting ${inches}" of snow (≥ ${thresholdInches}").`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: { url: `/resort/${slug}` },
        tag: `snow-alert-${slug}-${nextSnowDay.date}`,
      });

      notifiedMap[slug] = nextSnowDay.date;
      hasChanges = true;
    } catch {
      continue;
    }
  }

  if (hasChanges) {
    await setSnowAlertNotifiedMap(notifiedMap);
  }
}

self.addEventListener('periodicsync', (event: Event) => {
  const periodicEvent = event as Event & { tag?: string; waitUntil?: (promise: Promise<unknown>) => void };
  if (periodicEvent.tag !== 'freesnow-snow-alert-check') return;
  periodicEvent.waitUntil?.(runSnowAlertCheck());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string | undefined) ?? '/';
  event.waitUntil(self.clients.openWindow(url));
});