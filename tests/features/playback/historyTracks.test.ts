import { describe, expect, it } from 'vitest';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import { summarizeTrackAltitude } from '@/features/playback/altitudeTracks';
import {
  HISTORY_TRACK_LIMITS,
  buildDrawablePassIndex,
  normalizeHistoryTrackLimit,
} from '@/features/playback/historyTracks';

function pass(
  passId: string,
  endTime: number,
  points = 2,
  altitudes?: (number | 'ground' | undefined)[],
): AircraftPass {
  const trackPoints = Array.from({ length: points }, (_, i) => ({
    lon: i,
    lat: i,
    ts: i,
    ...(altitudes ? { alt: altitudes[i] } : {}),
    ground: altitudes?.[i] === 'ground',
  }));
  return {
    passId,
    hex: passId,
    startTime: endTime - 1,
    endTime,
    aircraft: {} as AircraftPass['aircraft'],
    trackPoints,
    altitudeSummary: summarizeTrackAltitude(trackPoints),
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

});
