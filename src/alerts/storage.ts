import { get, set } from 'idb-keyval';

const SETTINGS_KEY = 'freesnow_snow_alert_settings_v1';
const NOTIFIED_KEY = 'freesnow_snow_alert_notified_v1';
const memoryStore = new Map<string, unknown>();

export interface SnowAlertSettings {
  favoriteSlugs: string[];
  timezone: string;
  thresholdCm: number;
  enabled: boolean;
}

export type SnowAlertNotifiedMap = Record<string, string>;

export const DEFAULT_SNOW_ALERT_SETTINGS: SnowAlertSettings = {
  favoriteSlugs: [],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto',
  thresholdCm: 7.62,
  enabled: false,
};

function supportsIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function supportsLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

async function readValue<T>(key: string, fallback: T): Promise<T> {
  if (supportsIndexedDb()) {
    try {
      const value = await get<T>(key);
      return value ?? fallback;
    } catch {
      // ignore
    }
  }

  if (supportsLocalStorage()) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  return (memoryStore.get(key) as T | undefined) ?? fallback;
}

async function writeValue<T>(key: string, value: T): Promise<void> {
  if (supportsIndexedDb()) {
    try {
      await set(key, value);
      return;
    } catch {
      // ignore
    }
  }

  if (supportsLocalStorage()) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    } catch {
      // ignore
    }
  }

  memoryStore.set(key, value);
}

export async function getSnowAlertSettings(): Promise<SnowAlertSettings> {
  const value = await readValue<SnowAlertSettings | undefined>(SETTINGS_KEY, undefined);
  if (!value) return DEFAULT_SNOW_ALERT_SETTINGS;
  return {
    ...DEFAULT_SNOW_ALERT_SETTINGS,
    ...value,
    favoriteSlugs: Array.isArray(value.favoriteSlugs) ? value.favoriteSlugs : [],
  };
}

export async function setSnowAlertSettings(next: SnowAlertSettings): Promise<void> {
  await writeValue(SETTINGS_KEY, {
    ...next,
    favoriteSlugs: [...new Set(next.favoriteSlugs)],
  });
}

export async function getSnowAlertNotifiedMap(): Promise<SnowAlertNotifiedMap> {
  const value = await readValue<SnowAlertNotifiedMap | undefined>(NOTIFIED_KEY, undefined);
  return value ?? {};
}

export async function setSnowAlertNotifiedMap(next: SnowAlertNotifiedMap): Promise<void> {
  await writeValue(NOTIFIED_KEY, next);
}