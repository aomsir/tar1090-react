import { describe, expect, it, vi } from 'vitest';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import {
  clipTrackToAltitudeRange,
  summarizeTrackAltitude,
} from '@/features/playback/altitudeTracks';
import {
  HistoryTrackClipCache,
  selectHistoryTrackPaths,
} from '@/features/playback/historyTrackSelection';

function pass(
  passId: string,
  endTime: number,
  altitudes: Array<number | 'ground' | undefined>,
): AircraftPass {
  const trackPoints = altitudes.map((alt, index) => ({
    lon: index,
    lat: index,
    ts: index,
    alt,
    ground: alt === 'ground',
  }));
  return {
    passId,
    hex: passId,
    startTime: endTime - 1,
    endTime,
    aircraft: {} as AircraftPass['aircraft'],
    trackPoints,
    altitudeSummary: summarizeTrackAltitude(trackPoints),
    hadAltitude: true,
    hadGround: false,
    hadEmergency: false,
    hadSquawk: false,
  };
}

describe('selectHistoryTrackPaths', () => {
  it('skips clipping when the altitude envelope does not intersect', () => {
    const clipTrack = vi.fn();

    const result = selectHistoryTrackPaths([pass('high', 1, [30_000, 31_000])], 'all', null, {
      generation: 1,
      altitudeRange: { min: 0, max: 10_000 },
      clipTrack,
    });

    expect(result).toEqual(new Map());
    expect(clipTrack).not.toHaveBeenCalled();
  });

  it('filters before applying a numeric limit', () => {
    const result = selectHistoryTrackPaths(
      [
        pass('outside', 3, [30_000, 31_000]),
        pass('first-visible', 2, [1_000, 2_000]),
        pass('second-visible', 1, [3_000, 4_000]),
      ],
      1,
      null,
      { generation: 1, altitudeRange: { min: 0, max: 10_000 } },
    );

    expect([...result.keys()]).toEqual(['first-visible']);
  });

  it('returns complete tracks without clipping when filtering is disabled', () => {
    const track = pass('visible', 1, [30_000, 31_000]);
    const clipTrack = vi.fn();

    const result = selectHistoryTrackPaths([track], 'all', null, {
      generation: 1,
      clipTrack,
    });

    expect(result.get(track.passId)).toEqual([track.trackPoints]);
    expect(clipTrack).not.toHaveBeenCalled();
  });

  it('caches immutable clipped paths by generation, range, and pass', () => {
    const cache = new HistoryTrackClipCache();
    const crossing = pass('crossing', 1, [5_000, 15_000, 5_000]);
    const clipTrack = vi.fn(clipTrackToAltitudeRange);
    const options = {
      generation: 3,
      altitudeRange: { min: 0, max: 10_000 },
      cache,
      clipTrack,
    };

    const first = selectHistoryTrackPaths([crossing], 'all', null, options);
    const second = selectHistoryTrackPaths([crossing], 'all', null, options);
    const paths = first.get('crossing')!;

    expect(paths).toHaveLength(2);
    expect(second.get('crossing')).toBe(paths);
    expect(Object.isFrozen(paths)).toBe(true);
    expect(Object.isFrozen(paths[0])).toBe(true);
    expect(clipTrack).toHaveBeenCalledTimes(1);
    expect(cache.size).toBe(1);
  });

  it('invalidates cached paths when the generation changes', () => {
    const cache = new HistoryTrackClipCache();
    const crossing = pass('crossing', 1, [5_000, 15_000, 5_000]);
    const clipTrack = vi.fn(() => [[crossing.trackPoints[0]!, crossing.trackPoints[1]!]]);
    const options = {
      altitudeRange: { min: 0, max: 10_000 },
      cache,
      clipTrack,
    };

    selectHistoryTrackPaths([crossing], 'all', null, { ...options, generation: 3 });
    selectHistoryTrackPaths([crossing], 'all', null, { ...options, generation: 4 });

    expect(clipTrack).toHaveBeenCalledTimes(2);
    expect(cache.size).toBe(1);
  });

  it('clears cached paths explicitly', () => {
    const cache = new HistoryTrackClipCache();
    const range = { min: 0, max: 10_000 };
    cache.setGeneration(1);
    cache.set('pass', range, [[]]);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('pass', range)).toBeUndefined();
  });

  it('appends the complete selected pass even outside the range', () => {
    const selected = pass('selected', 1, [30_000, 31_000]);

    const result = selectHistoryTrackPaths([selected], 100, selected.passId, {
      generation: 1,
      altitudeRange: { min: 0, max: 10_000 },
      clipTrack: vi.fn(),
    });

    expect(result.get(selected.passId)).toEqual([selected.trackPoints]);
  });

  it('keeps a selected pass complete without clipping when it intersects the range', () => {
    const selected = pass('selected', 1, [5_000, 15_000, 5_000]);
    const clipTrack = vi.fn(clipTrackToAltitudeRange);

    const result = selectHistoryTrackPaths([selected], 100, selected.passId, {
      generation: 1,
      altitudeRange: { min: 0, max: 10_000 },
      clipTrack,
    });

    expect(result.get(selected.passId)).toEqual([selected.trackPoints]);
    expect(clipTrack).not.toHaveBeenCalled();
  });
});
