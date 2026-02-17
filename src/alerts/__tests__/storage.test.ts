import { beforeEach, describe, expect, it } from 'bun:test';
import {
  DEFAULT_SNOW_ALERT_SETTINGS,
  getSnowAlertNotifiedMap,
  getSnowAlertSettings,
  setSnowAlertNotifiedMap,
  setSnowAlertSettings,
} from '@/alerts/storage';

const SETTINGS_KEY = 'freesnow_snow_alert_settings_v1';
const NOTIFIED_KEY = 'freesnow_snow_alert_notified_v1';

beforeEach(() => {
  localStorage.clear();
});

describe('snow alert storage', () => {
  it('returns defaults when no persisted settings exist', async () => {
    const settings = await getSnowAlertSettings();
    expect(settings).toEqual(DEFAULT_SNOW_ALERT_SETTINGS);
  });

  it('deduplicates favorite slugs when saving settings', async () => {
    await setSnowAlertSettings({
      favoriteSlugs: ['vail-co', 'vail-co', 'alta-ut'],
      timezone: 'America/Denver',
      thresholdCm: 7.62,
      enabled: true,
    });

    const settings = await getSnowAlertSettings();
    expect(settings.favoriteSlugs).toEqual(['vail-co', 'alta-ut']);
    expect(settings.timezone).toBe('America/Denver');
    expect(settings.enabled).toBe(true);
  });

  it('sanitizes malformed favoriteSlugs from persisted payload', async () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        favoriteSlugs: 'not-an-array',
        timezone: 'America/Los_Angeles',
        thresholdCm: 10,
        enabled: true,
      }),
    );

    const settings = await getSnowAlertSettings();
    expect(settings.favoriteSlugs).toEqual([]);
    expect(settings.timezone).toBe('America/Los_Angeles');
    expect(settings.thresholdCm).toBe(10);
    expect(settings.enabled).toBe(true);
  });

  it('reads and writes the notified map', async () => {
    expect(await getSnowAlertNotifiedMap()).toEqual({});

    await setSnowAlertNotifiedMap({
      'vail-co': '2026-02-17',
      'alta-ut': '2026-02-18',
    });

    expect(await getSnowAlertNotifiedMap()).toEqual({
      'vail-co': '2026-02-17',
      'alta-ut': '2026-02-18',
    });

    const raw = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '{}');
    expect(raw['vail-co']).toBe('2026-02-17');
  });
});