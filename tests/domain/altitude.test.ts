import { describe, it, expect } from 'vitest';
import { altitudeColor, hslString } from './altitude';

describe('altitudeColor', () => {
  it('returns the unknown color for null/undefined', () => {
    expect(altitudeColor(null)).toEqual({ h: 0, s: 0, l: 20 });
    expect(altitudeColor(undefined)).toEqual({ h: 0, s: 0, l: 20 });
  });

  it('returns the ground color for "ground"', () => {
    expect(altitudeColor('ground')).toEqual({ h: 220, s: 0, l: 30 });
  });

  it('maps low altitude near the first hue anchor (orange ~20deg)', () => {
    const c = altitudeColor(0);
    expect(c.s).toBe(88);
    expect(c.h).toBeCloseTo(20, 5);
  });

  it('maps 2000ft to the yellow hue anchor (~32.5deg)', () => {
    expect(altitudeColor(2000).h).toBeCloseTo(32.5, 5);
  });

  it('clamps hue into [0,360) and saturation into [0,95]', () => {
    const c = altitudeColor(60000);
    expect(c.h).toBeGreaterThanOrEqual(0);
    expect(c.h).toBeLessThan(360);
    expect(c.s).toBeLessThanOrEqual(95);
  });

  it('hslString renders a css hsl() string', () => {
    expect(hslString({ h: 120, s: 88, l: 41 })).toBe('hsl(120, 88%, 41%)');
  });
});
