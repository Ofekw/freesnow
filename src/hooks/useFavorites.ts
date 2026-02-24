import { useState, useEffect, useCallback } from 'react';
import type { FavoriteResort } from '@/types';
import * as favStore from '@/data/favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteResort[]>(() =>
    favStore.getFavorites(),
  );

  // Sync across tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'pow_favorites') {
        setFavorites(favStore.getFavorites());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((slug: string) => {
    const { favorites: updated, isFav } = favStore.toggleFavorite(slug);
    setFavorites(updated);
    return isFav;
  }, []);

  const isFav = useCallback(
    (slug: string) => favorites.some((f) => f.slug === slug),
    [favorites],
  );

  return { favorites, toggle, isFav };
}
