import { describe, it, expect } from 'vitest';
import { registrationFromHexId } from './registration';

describe('registrationFromHexId', () => {
  it('derives US N-numbers (0xA-range)', () => {
    expect(registrationFromHexId('A00001')).toBe('N1');
    expect(registrationFromHexId('A00724')).toBe('N1000Z');
  });

  it('derives a French F- registration', () => {
    expect(registrationFromHexId('380000')).toBe('F-BAAA');
  });

  it('derives a Japanese JA registration', () => {
    expect(registrationFromHexId('840000')).toBe('JA0000');
  });

  it('returns null for unallocated / out-of-range hexes', () => {
    expect(registrationFromHexId('FFFFFF')).toBeNull();
  });
});
