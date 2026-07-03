import { describe, it, expect } from 'vitest';
import { findCountry, flagPath } from '@/domain/country';

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

  it('returns absolute public flag URL with leading slash', () => {
    expect(flagPath('US')).toBe('/flags/3x2/US.svg');
    expect(flagPath('us')).toBe('/flags/3x2/US.svg');
    expect(flagPath('za')).toBe('/flags/3x2/ZA.svg');
  });

  it('returns null for missing or empty country code', () => {
    expect(flagPath(null)).toBeNull();
    expect(flagPath('')).toBeNull();
  });
});
