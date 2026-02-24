import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const STORAGE_KEY = 'freesnow_tz';

/** Compute the current UTC offset string for a given IANA timezone */
export function getUtcOffset(iana: string): string {
  if (!iana) return '';
  if (iana === 'UTC') return '+0';
  try {
    const now = new Date();
    // Get the offset in minutes by comparing formatted parts
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'shortOffset',
    }).formatToParts(now);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart) {
      // e.g. "GMT-5" → "-5", "GMT+5:30" → "+5:30"
      return tzPart.value.replace('GMT', '');
    }
  } catch { /* ignore */ }
  return '';
}

/** Curated list of North-American timezones + UTC */
export const TZ_OPTIONS = [
  { value: '', label: 'Browser default' },
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Vancouver', label: 'Vancouver (PT)' },
  { value: 'America/Edmonton', label: 'Edmonton (MT)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'America/Halifax', label: 'Atlantic (AT)' },
  { value: 'UTC', label: 'UTC' },
] as const;

const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

function readStored(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v !== null) return v; // '' means "browser default"
  } catch { /* ignore */ }
  return ''; // default
}

interface TimezoneContextValue {
  /** The resolved IANA timezone string actually in use */
  tz: string;
  /** Raw stored value ('' = browser default) */
  tzRaw: string;
  /** Short display label */
  tzLabel: string;
  setTz: (iana: string) => void;
  /** Format a date/ISO string in the selected timezone */
  fmtDate: (iso: string | Date, opts: Intl.DateTimeFormatOptions) => string;
}

const TimezoneContext = createContext<TimezoneContextValue>({
  tz: browserTz,
  tzRaw: '',
  tzLabel: 'Browser',
  setTz: () => {},
  fmtDate: () => '',
});

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [tzRaw, setTzRaw] = useState(readStored);

  const tz = tzRaw || browserTz;

  const setTz = useCallback((iana: string) => {
    localStorage.setItem(STORAGE_KEY, iana);
    setTzRaw(iana);
  }, []);

  const resolvedIana = tzRaw || browserTz;
  const tzLabel =
    TZ_OPTIONS.find((o) => o.value === resolvedIana)?.label ??
    resolvedIana.split('/').pop()!.replace(/_/g, ' ');

  const fmtDate = useCallback(
    (iso: string | Date, opts: Intl.DateTimeFormatOptions): string => {
      const d = typeof iso === 'string' ? new Date(iso) : iso;
      return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: tz }).format(d);
    },
    [tz],
  );

  return (
    <TimezoneContext.Provider value={{ tz, tzRaw, tzLabel, setTz, fmtDate }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  return useContext(TimezoneContext);
}
