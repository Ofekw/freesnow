import { describe, it, expect, beforeEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useFavorites } from '@/hooks/useFavorites';

beforeEach(() => {
  localStorage.clear();
});

describe('useFavorites', () => {
  it('starts with no favorites', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  it('toggle adds a favorite', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle('vail-co'));
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0]!.slug).toBe('vail-co');
  });

  it('toggle removes an existing favorite', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle('vail-co'));
    act(() => result.current.toggle('vail-co'));
    expect(result.current.favorites).toHaveLength(0);
  });

  it('isFav returns true for favorited resorts', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle('vail-co'));
    expect(result.current.isFav('vail-co')).toBe(true);
    expect(result.current.isFav('stowe-vt')).toBe(false);
  });

  it('toggle returns isFav status', () => {
    const { result } = renderHook(() => useFavorites());
    let isFav: boolean | undefined;
    act(() => {
      isFav = result.current.toggle('vail-co');
    });
    expect(isFav).toBe(true);
    act(() => {
      isFav = result.current.toggle('vail-co');
    });
    expect(isFav).toBe(false);
  });

  it('can manage multiple favorites', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle('vail-co'));
    act(() => result.current.toggle('stowe-vt'));
    act(() => result.current.toggle('jackson-hole-wy'));
    expect(result.current.favorites).toHaveLength(3);
    expect(result.current.isFav('vail-co')).toBe(true);
    expect(result.current.isFav('stowe-vt')).toBe(true);
    expect(result.current.isFav('jackson-hole-wy')).toBe(true);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle('vail-co'));
    const stored = JSON.parse(localStorage.getItem('pow_favorites')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].slug).toBe('vail-co');
  });
});
