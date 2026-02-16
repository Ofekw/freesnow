import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type UnitSystem = 'imperial' | 'metric';

interface UnitsContextValue {
  units: UnitSystem;
  toggle: () => void;
  temp: 'F' | 'C';
  elev: 'ft' | 'm';
  snow: 'in' | 'cm';
}

const UnitsContext = createContext<UnitsContextValue>({
  units: 'imperial',
  toggle: () => {},
  temp: 'F',
  elev: 'ft',
  snow: 'in',
});

const STORAGE_KEY = 'freesnow_units';

function readStored(): UnitSystem {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'metric' || v === 'imperial') return v;
  } catch { /* ignore */ }
  return 'imperial';
}

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<UnitSystem>(readStored);

  const toggle = useCallback(() => {
    setUnits((prev) => {
      const next = prev === 'imperial' ? 'metric' : 'imperial';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value: UnitsContextValue = {
    units,
    toggle,
    temp: units === 'imperial' ? 'F' : 'C',
    elev: units === 'imperial' ? 'ft' : 'm',
    snow: units === 'imperial' ? 'in' : 'cm',
  };

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  return useContext(UnitsContext);
}
