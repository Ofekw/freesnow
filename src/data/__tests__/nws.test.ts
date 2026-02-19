import { describe, it, expect } from 'bun:test';
import { nwsToSnowMap } from '@/data/nws';
import type { NWSDailySnowfall } from '@/data/nws';

/* ── nwsToSnowMap ──────────────────────────────── */

describe('nwsToSnowMap', () => {
  it('converts array to map', () => {
    const days: NWSDailySnowfall[] = [
      { date: '2026-02-18', snowfallCm: 5.2 },
      { date: '2026-02-19', snowfallCm: 3.1 },
    ];
    const map = nwsToSnowMap(days);
    expect(map.get('2026-02-18')).toBe(5.2);
    expect(map.get('2026-02-19')).toBe(3.1);
    expect(map.size).toBe(2);
  });

  it('returns empty map for empty array', () => {
    const map = nwsToSnowMap([]);
    expect(map.size).toBe(0);
  });

  it('handles single entry', () => {
    const map = nwsToSnowMap([{ date: '2026-02-20', snowfallCm: 1.0 }]);
    expect(map.get('2026-02-20')).toBe(1.0);
    expect(map.has('2026-02-21')).toBe(false);
  });
});

/* ── fetchNWSSnowfall ─────────────────────────── */
/* Note: fetchNWSSnowfall and fetchNWSGridpoint make real HTTP requests.
   We test those with mock-based integration tests or e2e. The pure helper
   functions (nwsToSnowMap, parseInterval) are tested here. */
