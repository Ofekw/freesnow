import { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone, TZ_OPTIONS } from '@/context/TimezoneContext';
import './Layout.css';

export function Layout() {
  const { units, toggle, temp, elev } = useUnits();
  const { tzRaw, tzLabel, setTz } = useTimezone();
  const [tzOpen, setTzOpen] = useState(false);
  const tzRef = useRef<HTMLDivElement>(null);

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
            <ul className="tz-picker__dropdown">
              {TZ_OPTIONS.map((o) => (
                <li key={o.value}>
                  <button
                    className={`tz-picker__option ${tzRaw === o.value ? 'active' : ''}`}
                    onClick={() => { setTz(o.value); setTzOpen(false); }}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
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
            (CC BY 4.0). FreeSnow is open-source &amp; non-commercial.
          </p>
        </div>
      </footer>
    </div>
  );
}
