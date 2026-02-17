import { useState, useRef, useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone, TZ_OPTIONS, getUtcOffset } from '@/context/TimezoneContext';
import { useSnowAlerts } from '@/hooks/useSnowAlerts';
import './Layout.css';

export function Layout() {
  const { units, toggle, temp, elev } = useUnits();
  const { tzRaw, tzLabel, setTz } = useTimezone();
  const { statusIcon, statusTitle, toggleAlerts, isSupported, enabled, permission } = useSnowAlerts();
  const [tzOpen, setTzOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState('');
  const tzRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Compute UTC offsets once (they only change with DST, fine to recompute on render)
  const tzWithOffsets = useMemo(
    () =>
      TZ_OPTIONS.map((o) => ({
        ...o,
        offset: o.value ? `UTC${getUtcOffset(o.value)}` : '',
      })),
    [],
  );

  const filteredTz = useMemo(() => {
    if (!tzSearch.trim()) return tzWithOffsets;
    const q = tzSearch.toLowerCase();
    return tzWithOffsets.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        o.offset.toLowerCase().includes(q),
    );
  }, [tzSearch, tzWithOffsets]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!tzOpen) return;
    function handleClick(e: MouseEvent) {
      if (tzRef.current && !tzRef.current.contains(e.target as Node)) {
        setTzOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [tzOpen]);

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (tzOpen) {
      setTzSearch('');
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [tzOpen]);

  return (
    <div className="layout">
      <div className="fab-group">
        <button
          className="fab"
          onClick={toggle}
          aria-label={`Switch to ${units === 'imperial' ? 'metric' : 'imperial'} units`}
          title={`Switch to ${units === 'imperial' ? 'metric' : 'imperial'} units`}
        >
          °{temp} / {elev}
        </button>

        <button
          className={`fab fab--alert${permission === 'denied' ? ' fab--alert-blocked' : enabled ? ' fab--alert-on' : ''}`}
          onClick={toggleAlerts}
          aria-label={enabled ? 'Disable snow alerts' : 'Enable snow alerts'}
          title={statusTitle}
          disabled={!isSupported}
        >
          {statusIcon}
        </button>

        <div className="tz-picker" ref={tzRef}>
          <button
            className="fab"
            onClick={() => setTzOpen((p) => !p)}
            aria-label="Change timezone"
            title="Change timezone"
          >
            🌐 {tzLabel}
          </button>
          {tzOpen && (
            <div className="tz-picker__dropdown">
              <div className="tz-picker__search-wrap">
                <input
                  ref={searchRef}
                  className="tz-picker__search"
                  type="text"
                  placeholder="Search timezone…"
                  value={tzSearch}
                  onChange={(e) => setTzSearch(e.target.value)}
                />
              </div>
              <ul className="tz-picker__list">
                {filteredTz.map((o) => (
                  <li key={o.value}>
                    <button
                      className={`tz-picker__option ${tzRaw === o.value ? 'active' : ''}`}
                      onClick={() => { setTz(o.value); setTzOpen(false); }}
                    >
                      <span>{o.label}</span>
                      {o.offset && <span className="tz-picker__offset">{o.offset}</span>}
                    </button>
                  </li>
                ))}
                {filteredTz.length === 0 && (
                  <li className="tz-picker__empty">No matches</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <main className="main container">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <p>
            Weather data by{' '}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open-Meteo
            </a>{' '}
            (CC BY 4.0). FreeSnow is{' '}
            <a
              href="https://github.com/Ofekw/freesnow"
              target="_blank"
              rel="noopener noreferrer"
            >
              open-source
            </a>{' '}
            &amp; non-commercial.
          </p>
          <a
            className="footer__feedback"
            href="https://github.com/Ofekw/freesnow/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            Submit Feedback
          </a>
        </div>
      </footer>
    </div>
  );
}
