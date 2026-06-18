import { describe, expect, it } from 'vitest';
import { distanceNm } from './distance';

describe('distanceNm', () => {
  it('returns undefined when any coordinate is missing', () => {
    expect(distanceNm(undefined, 1, 2, 3)).toBeUndefined();
    expect(distanceNm(1, undefined, 2, 3)).toBeUndefined();
  });

  it('calculates receiver-relative nautical miles', () => {
    expect(distanceNm(0, 0, 0, 1)).toBeCloseTo(60.04, 1);
  });
});
