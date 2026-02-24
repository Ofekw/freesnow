import { describe, it, expect, beforeEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import { UnitsProvider, useUnits } from '@/context/UnitsContext';

function wrapper({ children }: { children: ReactNode }) {
  return <UnitsProvider>{children}</UnitsProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe('UnitsContext', () => {
  it('defaults to imperial', () => {
    const { result } = renderHook(() => useUnits(), { wrapper });
    expect(result.current.units).toBe('imperial');
    expect(result.current.temp).toBe('F');
    expect(result.current.elev).toBe('ft');
    expect(result.current.snow).toBe('in');
  });

  it('toggles to metric', () => {
    const { result } = renderHook(() => useUnits(), { wrapper });
    act(() => result.current.toggle());
    expect(result.current.units).toBe('metric');
    expect(result.current.temp).toBe('C');
    expect(result.current.elev).toBe('m');
    expect(result.current.snow).toBe('cm');
  });

  it('toggles back to imperial', () => {
    const { result } = renderHook(() => useUnits(), { wrapper });
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.units).toBe('imperial');
  });

  it('persists choice to localStorage', () => {
    const { result } = renderHook(() => useUnits(), { wrapper });
    act(() => result.current.toggle());
    expect(localStorage.getItem('pow_units')).toBe('metric');
  });

  it('reads persisted value on mount', () => {
    localStorage.setItem('pow_units', 'metric');
    const { result } = renderHook(() => useUnits(), { wrapper });
    expect(result.current.units).toBe('metric');
  });
});
