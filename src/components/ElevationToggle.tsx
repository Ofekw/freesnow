import type { ElevationBand } from '@/types';
import { fmtElevation } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import './ElevationToggle.css';

interface Props {
  value: ElevationBand;
  onChange: (band: ElevationBand) => void;
  elevations: { base: number; mid: number; top: number };
}

const BANDS: ElevationBand[] = ['base', 'mid', 'top'];

export function ElevationToggle({ value, onChange, elevations }: Props) {
  const { elev } = useUnits();
  return (
    <div className="elev-toggle" role="radiogroup" aria-label="Elevation band">
      {BANDS.map((b) => (
        <button
          key={b}
          role="radio"
          aria-checked={value === b}
          className={`elev-toggle__btn ${value === b ? 'active' : ''}`}
          onClick={() => onChange(b)}
        >
          <span className="elev-toggle__label">{b.charAt(0).toUpperCase() + b.slice(1)}</span>
          <span className="elev-toggle__elev">{fmtElevation(elevations[b], elev)}</span>
        </button>
      ))}
    </div>
  );
}
