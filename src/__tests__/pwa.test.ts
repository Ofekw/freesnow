import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test';

const registerSW = mock();

mock.module('virtual:pwa-register', () => ({
  registerSW,
}));

const originalSetInterval = globalThis.setInterval;
const setIntervalMock = mock(() => 1 as unknown as ReturnType<typeof setInterval>);
globalThis.setInterval = setIntervalMock as unknown as typeof setInterval;

const { registerAppServiceWorker } = await import('@/pwa');

afterAll(() => {
  globalThis.setInterval = originalSetInterval;
});

beforeEach(() => {
  registerSW.mockReset();
  setIntervalMock.mockReset();
});

describe('registerAppServiceWorker', () => {
  it('forces a refresh when a new service worker is available', () => {
    const updateSW = mock();
    registerSW.mockImplementation(() => updateSW);

    registerAppServiceWorker();
    const [{ onNeedRefresh }] = registerSW.mock.calls[0];
    onNeedRefresh();

    expect(registerSW).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: true,
        onNeedRefresh: expect.any(Function),
      }),
    );
    expect(updateSW).toHaveBeenCalledWith(true);
  });

  it('periodically checks for service worker updates after registration', async () => {
    const updateRegistration = mock(() => Promise.resolve());
    const updateSW = mock();
    registerSW.mockImplementation((options) => {
      options.onRegisteredSW?.('/sw.js', { update: updateRegistration });
      return updateSW;
    });

    registerAppServiceWorker();

    expect(setIntervalMock).toHaveBeenCalledTimes(1);
    const [checkForUpdates, intervalMs] = setIntervalMock.mock.calls[0];
    expect(intervalMs).toBe(60 * 60 * 1000);

    await checkForUpdates();
    expect(updateRegistration).toHaveBeenCalledTimes(1);
  });
});
