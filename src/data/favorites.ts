import type { FavoriteResort } from '@/types';

const STORAGE_KEY = 'pow_favorites';

function readAll(): FavoriteResort[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FavoriteResort[]) : [];
  } catch {
    return [];
  }
}

function writeAll(favs: FavoriteResort[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function getFavorites(): FavoriteResort[] {
  return readAll();
}

export function isFavorite(slug: string): boolean {
  return readAll().some((f) => f.slug === slug);
}

export function addFavorite(slug: string): FavoriteResort[] {
  const favs = readAll();
  if (favs.some((f) => f.slug === slug)) return favs;
  const updated = [...favs, { slug, addedAt: new Date().toISOString() }];
  writeAll(updated);
  return updated;
}

export function removeFavorite(slug: string): FavoriteResort[] {
  const updated = readAll().filter((f) => f.slug !== slug);
  writeAll(updated);
  return updated;
}

export function toggleFavorite(slug: string): { favorites: FavoriteResort[]; isFav: boolean } {
  if (isFavorite(slug)) {
    return { favorites: removeFavorite(slug), isFav: false };
  }
  return { favorites: addFavorite(slug), isFav: true };
}
