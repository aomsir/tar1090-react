import { describe, it, expect } from 'vitest';
import { findCountry, flagPath } from './country';

describe('country', () => {
  it('maps a South African hex to its country', () => {
    const c = findCountry('008012');
    expect(c.country).toBe('South Africa');
    expect(c.country_code).toBe('za');
  });

  it('maps a US hex (0xA-range) to United States', () => {
    expect(findCountry('A00001').country).toBe('United States');
  });

  it('returns the unassigned range (null country_code) for out-of-table hexes', () => {
    expect(findCountry('FFFFFF').country_code).toBeNull();
  });

  it('builds an uppercase flag path under flags/3x2', () => {
    expect(flagPath('za')).toBe('flags/3x2/ZA.svg');
    expect(flagPath(null)).toBeNull();
    expect(flagPath('')).toBeNull();
  });
});
