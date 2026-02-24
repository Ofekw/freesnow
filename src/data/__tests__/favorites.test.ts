import { describe, it, expect, beforeEach } from 'bun:test';
import {
  getFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
} from '@/data/favorites';

beforeEach(() => {
  localStorage.clear();
});

describe('favorites data store', () => {
  describe('getFavorites', () => {
    it('returns empty array when nothing stored', () => {
      expect(getFavorites()).toEqual([]);
    });

    it('returns stored favorites', () => {
      const fav = [{ slug: 'vail-co', addedAt: '2025-01-01T00:00:00.000Z' }];
      localStorage.setItem('pow_favorites', JSON.stringify(fav));
      expect(getFavorites()).toEqual(fav);
    });

    it('returns empty array on corrupted data', () => {
      localStorage.setItem('pow_favorites', 'not-json');
      expect(getFavorites()).toEqual([]);
    });
  });

  describe('isFavorite', () => {
    it('returns false for non-existent slug', () => {
      expect(isFavorite('nonexistent')).toBe(false);
    });

    it('returns true for stored slug', () => {
      addFavorite('vail-co');
      expect(isFavorite('vail-co')).toBe(true);
    });
  });

  describe('addFavorite', () => {
    it('adds a resort to favorites', () => {
      const result = addFavorite('vail-co');
      expect(result).toHaveLength(1);
      expect(result[0]!.slug).toBe('vail-co');
      expect(result[0]!.addedAt).toBeTruthy();
    });

    it('does not duplicate existing favorites', () => {
      addFavorite('vail-co');
      const result = addFavorite('vail-co');
      expect(result).toHaveLength(1);
    });

    it('persists to localStorage', () => {
      addFavorite('vail-co');
      const stored = JSON.parse(localStorage.getItem('pow_favorites')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].slug).toBe('vail-co');
    });
  });

  describe('removeFavorite', () => {
    it('removes a resort from favorites', () => {
      addFavorite('vail-co');
      addFavorite('stowe-vt');
      const result = removeFavorite('vail-co');
      expect(result).toHaveLength(1);
      expect(result[0]!.slug).toBe('stowe-vt');
    });

    it('handles removing non-existent slug gracefully', () => {
      addFavorite('vail-co');
      const result = removeFavorite('nonexistent');
      expect(result).toHaveLength(1);
    });
  });

  describe('toggleFavorite', () => {
    it('adds when not favorited, returns isFav=true', () => {
      const { favorites, isFav } = toggleFavorite('vail-co');
      expect(isFav).toBe(true);
      expect(favorites).toHaveLength(1);
    });

    it('removes when already favorited, returns isFav=false', () => {
      addFavorite('vail-co');
      const { favorites, isFav } = toggleFavorite('vail-co');
      expect(isFav).toBe(false);
      expect(favorites).toHaveLength(0);
    });
  });
});
