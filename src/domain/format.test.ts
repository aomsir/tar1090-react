import { describe, it, expect } from 'vitest';
import { formatAltitude, ALTITUDE_GROUND } from '@/domain/format';

describe('formatAltitude', () => {
  it('formats numeric feet with thousands separator and unit using en-US locale', () => {
    expect(formatAltitude(33000, 'en')).toBe('33,000 ft');
  });
  it('formats numeric feet using zh-CN locale', () => {
    expect(formatAltitude(33000, 'zh-CN')).toBe('33,000 ft');
  });
  it('renders ground as the stable ALTITUDE_GROUND marker for caller translation', () => {
    expect(formatAltitude('ground', 'en')).toBe(ALTITUDE_GROUND);
  });
  it('renders missing value as dash', () => {
    expect(formatAltitude(null, 'en')).toBe('—');
  });
  it('renders undefined as dash', () => {
    expect(formatAltitude(undefined, 'en')).toBe('—');
  });
  it('falls back to en-US formatting when language is undefined', () => {
    expect(formatAltitude(33000)).toBe('33,000 ft');
  });
});
