import { describe, expect, it } from 'vitest';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import {
  HISTORY_TRACK_LIMITS,
  buildDrawablePassIndex,
  normalizeHistoryTrackLimit,
  selectHistoryTrackMap,
} from '@/features/playback/historyTracks';

function pass(passId: string, endTime: number, points = 2): AircraftPass {
  return {
    passId,
    hex: passId,
    startTime: endTime - 1,
    endTime,
    aircraft: {} as AircraftPass['aircraft'],
    trackPoints: Array.from({ length: points }, (_, ts) => ({ lon: ts, lat: ts, ts })),
    hadAltitude: false,
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
});
