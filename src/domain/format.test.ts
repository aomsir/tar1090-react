import { describe, it, expect } from 'vitest';
import { formatAltitude } from '@/domain/format';

describe('formatAltitude', () => {
  it('formats numeric feet with thousands separator and unit', () => {
    expect(formatAltitude(33000)).toBe('33,000 ft');
  });
  it('renders ground as Ground', () => {
    expect(formatAltitude('ground')).toBe('Ground');
  });
  it('renders missing value as dash', () => {
    expect(formatAltitude(null)).toBe('—');
  });
  it('renders undefined as dash', () => {
    expect(formatAltitude(undefined)).toBe('—');
  });
});
