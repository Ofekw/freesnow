import { describe, it, expect } from 'vitest';
import { getRainDotRating } from './weather';

describe('getRainDotRating', () => {
  it('returns 0 dots for no rain', () => {
    expect(getRainDotRating(0)).toBe(0);
    expect(getRainDotRating(-0.1)).toBe(0);
  });

  it('returns 1 dot for rain between 0 and 0.1 inches', () => {
    expect(getRainDotRating(0.001)).toBe(1);
    expect(getRainDotRating(0.05)).toBe(1);
    expect(getRainDotRating(0.1)).toBe(1);
  });

  it('returns 2 dots for rain between 0.1 and 0.5 inches', () => {
    expect(getRainDotRating(0.11)).toBe(2);
    expect(getRainDotRating(0.3)).toBe(2);
    expect(getRainDotRating(0.5)).toBe(2);
  });

  it('returns 3 dots for rain over 0.5 inches', () => {
    expect(getRainDotRating(0.51)).toBe(3);
    expect(getRainDotRating(1.0)).toBe(3);
    expect(getRainDotRating(5.0)).toBe(3);
  });
});
