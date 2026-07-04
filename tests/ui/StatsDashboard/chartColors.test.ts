import { describe, it, expect } from 'vitest';
import { SERIES_COLORS, seriesColor, AMBER } from '@/ui/StatsDashboard/chartColors';

describe('seriesColor', () => {
  it('returns amber for the first series', () => {
    expect(seriesColor(0)).toBe(AMBER);
  });

  it('returns distinct colors for the first six series', () => {
    const six = [0, 1, 2, 3, 4, 5].map(seriesColor);
    expect(new Set(six).size).toBe(6);
  });

  it('cycles the palette beyond its length', () => {
    expect(seriesColor(6)).toBe(SERIES_COLORS[0]);
    expect(seriesColor(7)).toBe(SERIES_COLORS[1]);
  });
});
