import { registerSW } from 'virtual:pwa-register';

const SW_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

export function registerAppServiceWorker() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      queueMicrotask(() => {
        void updateSW(true);
      });
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        void registration.update();
      }, SW_UPDATE_INTERVAL_MS);
    },
  });
}
