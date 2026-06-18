import { describe, expect, it } from 'vitest';
import {
  formatAge,
  formatCoordinate,
  formatDistanceNm,
  formatNumber,
  formatRssi,
  formatSpeedKt,
  formatVerticalRate,
} from './units';

describe('tar1090 unit formatting', () => {
  it('formats missing values consistently', () => {
    expect(formatNumber(undefined)).toBe('—');
    expect(formatSpeedKt(undefined)).toBe('');
    expect(formatDistanceNm(undefined)).toBe('');
  });

  it('formats table-friendly numeric fields', () => {
    expect(formatSpeedKt(415)).toBe('415');
    expect(formatVerticalRate(-512)).toBe('-512');
    expect(formatDistanceNm(12.34)).toBe('12.3');
    expect(formatRssi(-8.42)).toBe('-8.4');
    expect(formatAge(3.7)).toBe('4');
    expect(formatCoordinate(34.238521)).toBe('34.2385');
  });
});
