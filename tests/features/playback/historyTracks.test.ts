import { describe, expect, it } from 'vitest';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import {
  HISTORY_TRACK_LIMITS,
  buildDrawablePassIndex,
  normalizeHistoryTrackLimit,
  passMatchesAltitudeRange,
  selectHistoryTrackMap,
} from '@/features/playback/historyTracks';

function pass(
  passId: string,
  endTime: number,
  points = 2,
  altitudes?: (number | 'ground' | undefined)[],
): AircraftPass {
  return {
    passId,
    hex: passId,
    startTime: endTime - 1,
    endTime,
    aircraft: {} as AircraftPass['aircraft'],
    trackPoints: Array.from({ length: points }, (_, i) => ({
      lon: i,
      lat: i,
      ts: i,
      ...(altitudes ? { alt: altitudes[i] } : {}),
    })),
    hadAltitude: !!altitudes,
    hadGround: false,
    hadEmergency: false,
    hadSquawk: false,
  };
}

describe('history tracks', () => {
  it('exports the supported track limits and normalizes unknown values', () => {
    expect(HISTORY_TRACK_LIMITS).toEqual([100, 500, 1000, 2000, 5000, 'all']);
    expect(normalizeHistoryTrackLimit(500)).toBe(500);
    expect(normalizeHistoryTrackLimit('all')).toBe('all');
    expect(normalizeHistoryTrackLimit(99)).toBe(1000);
  });

  it('filters non-drawable passes and sorts recent passes without mutating input', () => {
    const passes = [
      pass('z', 20),
      pass('ignored', 30, 1),
      pass('b', 20),
      pass('a', 20),
      pass('old', 10),
    ];

    expect(buildDrawablePassIndex(passes).map(({ passId }) => passId)).toEqual([
      'a',
      'b',
      'z',
      'old',
    ]);
    expect(passes.map(({ passId }) => passId)).toEqual(['z', 'ignored', 'b', 'a', 'old']);
  });

  it('uses code-unit ordering for tied end times', () => {
    const result = buildDrawablePassIndex([
      pass('a', 20),
      pass('Z', 20),
      pass('!', 20),
      pass('0', 20),
      pass('A', 20),
      pass('z', 20),
    ]);

    expect(result.map(({ passId }) => passId)).toEqual(['!', '0', 'A', 'Z', 'a', 'z']);
  });

  it('selects the most recent passes for a numeric limit', () => {
    const ordered = buildDrawablePassIndex(
      Array.from({ length: 101 }, (_, index) => pass(`pass-${index}`, index)),
    );

    const selected = selectHistoryTrackMap(ordered, 100, null);

    expect(selected.size).toBe(100);
    expect([...selected.keys()].slice(0, 2)).toEqual(['pass-100', 'pass-99']);
    expect(selected.has('pass-0')).toBe(false);
  });

  it('selects all drawable passes when the limit is all', () => {
    const ordered = buildDrawablePassIndex([pass('old', 1), pass('newest', 2)]);

    expect([...selectHistoryTrackMap(ordered, 'all', null).keys()]).toEqual(['newest', 'old']);
  });

  it('appends an older selected drawable pass beyond the numeric limit without duplication', () => {
    const ordered = buildDrawablePassIndex(
      Array.from({ length: 101 }, (_, index) => pass(`pass-${index}`, index)),
    );

    const selected = selectHistoryTrackMap(ordered, 100, 'pass-0');

    expect(selected.size).toBe(101);
    expect([...selected.keys()].slice(0, 2)).toEqual(['pass-100', 'pass-99']);
    expect([...selected.keys()].at(-1)).toBe('pass-0');
  });

  it('ignores missing and non-drawable selected passes', () => {
    const ordered = buildDrawablePassIndex([pass('drawable', 2), pass('single-point', 1, 1)]);

    expect([...selectHistoryTrackMap(ordered, 100, 'missing').keys()]).toEqual(['drawable']);
    expect([...selectHistoryTrackMap(ordered, 100, 'single-point').keys()]).toEqual(['drawable']);
    expect(selectHistoryTrackMap([], 100, 'drawable')).toEqual(new Map());
  });

  it('filters passes by altitude range before applying numeric limit', () => {
    const passes = buildDrawablePassIndex([
      pass('low', 3, 2, [1000, 2000]),
      pass('mid', 2, 2, [15000, 16000]),
      pass('high', 1, 2, [35000, 36000]),
    ]);

    const result = selectHistoryTrackMap(passes, 'all', null, { min: 0, max: 10000 });

    expect([...result.keys()]).toEqual(['low']);
  });

  it('does not filter when altitudeFilter is undefined', () => {
    const passes = buildDrawablePassIndex([
      pass('low', 2, 2, [1000, 2000]),
      pass('high', 1, 2, [35000, 36000]),
    ]);

    const result = selectHistoryTrackMap(passes, 'all', null);

    expect(result.size).toBe(2);
  });

  it('altitude filter is applied before quantity limit', () => {
    const passes = buildDrawablePassIndex([
      pass('a', 3, 2, [5000, 6000]),
      pass('b', 2, 2, [30000, 31000]),
      pass('c', 1, 2, [7000, 8000]),
    ]);

    const result = selectHistoryTrackMap(passes, 100, null, { min: 0, max: 10000 });

    expect(result.size).toBe(2);
    expect(result.has('a')).toBe(true);
    expect(result.has('c')).toBe(true);
    expect(result.has('b')).toBe(false);
  });

  it('always includes the selected pass even when filtered out by altitude', () => {
    const passes = buildDrawablePassIndex([
      pass('low', 2, 2, [1000, 2000]),
      pass('high', 1, 2, [35000, 36000]),
    ]);

    const result = selectHistoryTrackMap(passes, 'all', 'high', { min: 0, max: 10000 });

    expect(result.size).toBe(2);
    expect(result.has('low')).toBe(true);
    expect(result.has('high')).toBe(true);
  });
});

describe('passMatchesAltitudeRange', () => {
  it('returns true when any track point altitude is within range', () => {
    expect(passMatchesAltitudeRange(pass('match', 1, 3, [500, 1500, 2500]), 1000, 2000)).toBe(true);
  });

  it('returns false when all altitudes are outside range', () => {
    expect(passMatchesAltitudeRange(pass('outside', 1, 2, [500, 2500]), 1000, 2000)).toBe(false);
  });

  it('returns false for ground-only passes', () => {
    expect(passMatchesAltitudeRange(pass('ground', 1, 2, ['ground', 'ground']), 1000, 2000)).toBe(
      false,
    );
  });

  it('returns false when all altitudes are undefined', () => {
    expect(
      passMatchesAltitudeRange(pass('undefined', 1, 2, [undefined, undefined]), 1000, 2000),
    ).toBe(false);
  });

  it('returns true when altitude equals min bound exactly', () => {
    expect(passMatchesAltitudeRange(pass('min', 1, 1, [1000]), 1000, 2000)).toBe(true);
  });

  it('returns true when altitude equals max bound exactly', () => {
    expect(passMatchesAltitudeRange(pass('max', 1, 1, [2000]), 1000, 2000)).toBe(true);
  });

  it('handles mixed altitude types', () => {
    expect(
      passMatchesAltitudeRange(pass('mixed', 1, 4, ['ground', undefined, 1500, 2500]), 1000, 2000),
    ).toBe(true);
  });

  it('returns false for a pass with no track points', () => {
    expect(passMatchesAltitudeRange(pass('empty', 1, 0), 1000, 2000)).toBe(false);
  });
});
