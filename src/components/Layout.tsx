import { Outlet, Link } from 'react-router-dom';
import { useUnits } from '@/context/UnitsContext';
import './Layout.css';

export function Layout() {
  const { units, toggle, temp, elev } = useUnits();

  return (
    <div className="layout">
      <header className="header">
        <div className="container header__inner">
          <Link to="/" className="header__logo">
            <SnowflakeIcon />
            <span>FreeSnow</span>
          </Link>
          <button
            className="header__units-toggle"
            onClick={toggle}
            aria-label={`Switch to ${units === 'imperial' ? 'metric' : 'imperial'} units`}
            title={`Switch to ${units === 'imperial' ? 'metric' : 'imperial'} units`}
          >
            °{temp} / {elev}
          </button>
        </div>
      </header>

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

function SnowflakeIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
      {/* small ticks */}
      <line x1="12" y1="2" x2="9" y2="5" />
      <line x1="12" y1="2" x2="15" y2="5" />
      <line x1="12" y1="22" x2="9" y2="19" />
      <line x1="12" y1="22" x2="15" y2="19" />
      <line x1="2" y1="12" x2="5" y2="9" />
      <line x1="2" y1="12" x2="5" y2="15" />
      <line x1="22" y1="12" x2="19" y2="9" />
      <line x1="22" y1="12" x2="19" y2="15" />
    </svg>
  );
}
