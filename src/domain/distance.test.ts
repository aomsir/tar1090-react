import { describe, expect, it } from 'vitest';
import { distanceNm } from './distance';

describe('distanceNm', () => {
  it('returns undefined when any coordinate is missing', () => {
    expect(distanceNm(undefined, 1, 2, 3)).toBeUndefined();
    expect(distanceNm(1, undefined, 2, 3)).toBeUndefined();
    expect(distanceNm(1, 2, undefined, 3)).toBeUndefined();
    expect(distanceNm(1, 2, 3, undefined)).toBeUndefined();
  });

  it('returns undefined for NaN or Infinity coordinates', () => {
    expect(distanceNm(Number.NaN, 1, 2, 3)).toBeUndefined();
    expect(distanceNm(1, Number.POSITIVE_INFINITY, 2, 3)).toBeUndefined();
  });

  it('calculates receiver-relative nautical miles', () => {
    expect(distanceNm(0, 0, 0, 1)).toBeCloseTo(60.04, 1);
  });
});
