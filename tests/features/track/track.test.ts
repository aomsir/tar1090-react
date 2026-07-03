import { describe, it, expect } from 'vitest';
import { extractTrackPoints, buildTrackSegments } from '@/features/track/track';
import { altitudeColor, hslString } from '@/domain/altitude';
import type { AircraftSnapshot } from '@/data/types';
import type { TrackPoint } from '@/features/track/track';

const frame = (now: number, ac: Record<string, unknown>[]): AircraftSnapshot => ({
  now,
  messages: 0,
  aircraft: ac as unknown as AircraftSnapshot['aircraft'],
});

describe('extractTrackPoints', () => {
  it('collects positioned points for a hex in time order, skipping frames without it', () => {
    const frames = [
      frame(100, [{ hex: 'abc', lat: 1, lon: 2, altitude: 1000 }]),
      frame(130, [{ hex: 'zzz', lat: 9, lon: 9 }]),
      frame(160, [{ hex: 'abc', lat: 3, lon: 4, altitude: 'ground' }]),
    ];
    const pts = extractTrackPoints(frames, 'abc');
    expect(pts).toHaveLength(2);
    expect(pts[0]).toMatchObject({ lon: 2, lat: 1, ts: 100, ground: false });
    expect(pts[1]).toMatchObject({ lon: 4, lat: 3, ts: 160, ground: true });
  });

  it('skips frames where the hex has no position and dedups consecutive identical positions', () => {
    const frames = [
      frame(100, [{ hex: 'abc', altitude: 1000 }]), // no lat/lon
      frame(130, [{ hex: 'abc', lat: 1, lon: 2, altitude: 1000 }]),
      frame(160, [{ hex: 'abc', lat: 1, lon: 2, altitude: 1000 }]), // dup
      frame(190, [{ hex: 'abc', lat: 1.5, lon: 2, altitude: 1000 }]),
    ];
    const pts = extractTrackPoints(frames, 'abc');
    expect(pts.map((p) => p.ts)).toEqual([130, 190]);
  });
});

const pt = (over: Partial<TrackPoint>): TrackPoint => ({
  lon: 0,
  lat: 0,
  alt: 1000,
  ts: 0,
  ground: false,
  ...over,
});

describe('buildTrackSegments', () => {
  it('returns empty for no points', () => {
    expect(buildTrackSegments([])).toEqual([]);
  });

  it('groups same-altitude-band points into one solid segment', () => {
    const pts = [
      pt({ lon: 0, lat: 0, ts: 0, alt: 1000 }),
      pt({ lon: 1, lat: 0, ts: 30, alt: 1000 }),
      pt({ lon: 2, lat: 0, ts: 60, alt: 1000 }),
    ];
    const segs = buildTrackSegments(pts);
    expect(segs).toHaveLength(1);
    expect(segs[0].estimated).toBe(false);
    expect(segs[0].coords).toHaveLength(3);
    expect(segs[0].colorKey).toBe(hslString(altitudeColor(1000)));
  });

  it('splits on altitude-band change and keeps the polyline continuous', () => {
    const pts = [
      pt({ lon: 0, lat: 0, ts: 0, alt: 1000 }),
      pt({ lon: 1, lat: 0, ts: 30, alt: 35000 }),
    ];
    const segs = buildTrackSegments(pts);
    expect(segs).toHaveLength(2);
    expect(segs[1].coords[0]).toEqual([0, 0]);
    expect(segs[1].coords[1]).toEqual([1, 0]);
  });

  it('emits a dashed estimated bridge across a large time gap', () => {
    const pts = [
      pt({ lon: 0, lat: 0, ts: 0, alt: 1000 }),
      pt({ lon: 5, lat: 0, ts: 1000, alt: 1000 }),
    ];
    const segs = buildTrackSegments(pts, { gapThresholdSec: 90 });
    const estimated = segs.filter((s) => s.estimated);
    expect(estimated).toHaveLength(1);
    expect(estimated[0].coords).toEqual([
      [0, 0],
      [5, 0],
    ]);
  });

  it('marks ground points with the ground color and ground flag', () => {
    const pts = [
      pt({ alt: 'ground', ground: true, ts: 0 }),
      pt({ alt: 'ground', ground: true, ts: 30, lon: 1 }),
    ];
    const segs = buildTrackSegments(pts);
    expect(segs[0].ground).toBe(true);
    expect(segs[0].colorKey).toBe(hslString(altitudeColor('ground')));
  });
});
