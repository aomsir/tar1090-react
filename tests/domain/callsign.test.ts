import { describe, it, expect } from 'vitest';
import { normalizeCallsign } from '@/domain/callsign';

describe('normalizeCallsign', () => {
  it('trims whitespace and uppercases', () => {
    expect(normalizeCallsign('  cca1234  ')).toBe('CCA1234');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeCallsign('')).toBe('');
    expect(normalizeCallsign('   ')).toBe('');
  });

  it('handles already uppercase', () => {
    expect(normalizeCallsign('UAL123')).toBe('UAL123');
  });
});
