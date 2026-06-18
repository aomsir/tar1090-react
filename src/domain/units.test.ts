import { describe, expect, it } from 'vitest';
import {
  formatAge,
  formatCoordinate,
  formatDetail,
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

  it('formats numbers with decimal digits', () => {
    expect(formatNumber(1234.567, 2)).toBe('1,234.57');
  });

  it('formats detail values with optional suffix', () => {
    expect(formatDetail(undefined)).toBe('—');
    expect(formatDetail(null)).toBe('—');
    expect(formatDetail('')).toBe('—');
    expect(formatDetail('B738')).toBe('B738');
    expect(formatDetail(250, ' kt')).toBe('250 kt');
  });
});
