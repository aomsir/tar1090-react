import { describe, expect, it } from 'vitest';
import {
  altitudeSummaryIntersects,
  clipTrackToAltitudeRange,
  normalizeAltitude,
  normalizeAltitudeRange,
  summarizeTrackAltitude,
} from '@/features/playback/altitudeTracks';
import type { TrackPoint } from '@/features/track/track';

const point = (lon: number, alt: TrackPoint['alt'], ts: number, track = 350): TrackPoint => ({
  lon,
  lat: lon,
  alt,
  ts,
  track,
  speed: 100 + lon,
  ground: alt === 'ground',
});

describe('altitude tracks', () => {
  it('normalizes ground to zero and rejects invalid numeric altitude', () => {
    expect(normalizeAltitude('ground')).toBe(0);
    expect(normalizeAltitude(Number.NaN)).toBeUndefined();
    expect(normalizeAltitude(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(normalizeAltitude(undefined)).toBeUndefined();
  });

  it('orders, clamps, and quantizes committed ranges', () => {
    expect(normalizeAltitudeRange(28_749, -200)).toEqual({ min: 0, max: 28_500 });
    expect(normalizeAltitudeRange(44_751, 45_500)).toEqual({ min: 45_000, max: 45_000 });
  });

  it('summarizes known, ground, and unknown altitudes', () => {
    const summary = summarizeTrackAltitude([
      point(0, 2_000, 0),
      point(1, 'ground', 1),
      point(2, undefined, 2),
    ]);

    expect(summary).toEqual({ min: 0, max: 2_000, hasGround: true, hasUnknown: true });
    expect(altitudeSummaryIntersects(summary, { min: 1_000, max: 3_000 })).toBe(true);
    expect(altitudeSummaryIntersects(summary, { min: 3_000, max: 4_000 })).toBe(false);
  });

  it('returns the original track in one subpath when every point is inside', () => {
    const input = [point(0, 500, 0), point(1, 1_000, 10)];

    expect(clipTrackToAltitudeRange(input, { min: 0, max: 1_000 })).toEqual([input]);
  });

  it('omits a single in-range point because a visible path needs two points', () => {
    expect(clipTrackToAltitudeRange([point(0, 500, 0)], { min: 0, max: 1_000 })).toEqual([]);
  });

  it('omits a track entirely when every point is outside on the same side', () => {
    expect(
      clipTrackToAltitudeRange([point(0, 2_000, 0), point(1, 3_000, 10)], { min: 0, max: 1_000 }),
    ).toEqual([]);
  });

  it('clips a segment crossing both range bounds with exact interpolated endpoints', () => {
    const result = clipTrackToAltitudeRange(
      [point(0, -500, 0), point(2, 1_500, 20, 10)],
      { min: 0, max: 1_000 },
    );

    expect(result).toEqual([
      [
        expect.objectContaining({ lon: 0.5, lat: 0.5, alt: 0, ts: 5, speed: 100.5, track: 355 }),
        expect.objectContaining({ lon: 1.5, lat: 1.5, alt: 1_000, ts: 15, speed: 101.5, track: 5 }),
      ],
    ]);
  });

  it('uses exact range endpoint altitudes for decimal boundary crossings', () => {
    const range = { min: 0.04, max: 0.07 };
    const result = clipTrackToAltitudeRange(
      [point(0, 0.01, 0), point(1, 0.1, 10)],
      range,
    );

    expect(result[0]?.[0]?.alt).toBe(range.min);
    expect(result[0]?.[1]?.alt).toBe(range.max);
  });

  it('keeps points lying exactly on either range boundary', () => {
    const input = [point(0, 0, 0), point(1, 1_000, 10)];

    expect(clipTrackToAltitudeRange(input, { min: 0, max: 1_000 })).toEqual([input]);
  });

  it('omits zero-length contacts when leaving the lower boundary', () => {
    const result = clipTrackToAltitudeRange(
      [point(0, 0, 0), point(1, -500, 10)],
      { min: 0, max: 1_000 },
    );

    expect(result).toEqual([]);
  });

  it('omits zero-length contacts when leaving the upper boundary', () => {
    const result = clipTrackToAltitudeRange(
      [point(0, 1_000, 0), point(1, 1_500, 10)],
      { min: 0, max: 1_000 },
    );

    expect(result).toEqual([]);
  });

  it('omits zero-length contacts when arriving at the lower boundary', () => {
    const result = clipTrackToAltitudeRange(
      [point(0, -500, 0), point(1, 0, 10)],
      { min: 0, max: 1_000 },
    );

    expect(result).toEqual([]);
  });

  it('omits zero-length contacts when arriving at the upper boundary', () => {
    const result = clipTrackToAltitudeRange(
      [point(0, 1_500, 0), point(1, 1_000, 10)],
      { min: 0, max: 1_000 },
    );

    expect(result).toEqual([]);
  });

  it('keeps a real boundary point when a tangent contact follows an inside segment', () => {
    const result = clipTrackToAltitudeRange(
      [point(0, 500, 0), point(1, 0, 10), point(2, -500, 20)],
      { min: 0, max: 1_000 },
    );

    expect(result).toEqual([[point(0, 500, 0), point(1, 0, 10)]]);
  });

  it('keeps a real boundary point when an inside segment follows a tangent contact', () => {
    const input = [point(0, 1_500, 0), point(1, 1_000, 10), point(2, 500, 20)];
    const result = clipTrackToAltitudeRange(
      input,
      { min: 0, max: 1_000 },
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.[0]).toBe(input[1]);
    expect(result[0]?.[1]).toBe(input[2]);
  });

  it('clips an inside-outside-inside track at exact altitude boundaries', () => {
    const input = [point(0, 500, 0), point(1, 1_500, 10), point(2, 500, 20)];
    const result = clipTrackToAltitudeRange(input, { min: 0, max: 1_000 });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      input[0],
      expect.objectContaining({ lon: 0.5, lat: 0.5, alt: 1_000, ts: 5, speed: 100.5 }),
    ]);
    expect(result[1]).toEqual([
      expect.objectContaining({ lon: 1.5, lat: 1.5, alt: 1_000, ts: 15, speed: 101.5 }),
      input[2],
    ]);
    expect(input).toEqual([point(0, 500, 0), point(1, 1_500, 10), point(2, 500, 20)]);
  });

  it('creates separate subpaths for repeated re-entry', () => {
    const result = clipTrackToAltitudeRange(
      [
        point(0, 500, 0),
        point(1, 1_500, 10),
        point(2, 500, 20),
        point(3, 1_500, 30),
        point(4, 500, 40),
      ],
      { min: 0, max: 1_000 },
    );

    expect(result.map((path) => path.map(({ lon }) => lon))).toEqual([
      [0, 0.5],
      [1.5, 2, 2.5],
      [3.5, 4],
    ]);
  });

  it('deduplicates zero-length segments and shared segment endpoints', () => {
    const input = [point(0, 500, 0), point(0, 500, 0), point(1, 500, 10)];
    const result = clipTrackToAltitudeRange(input, { min: 0, max: 1_000 });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
    expect(result[0]?.map(({ lon, ts }) => [lon, ts])).toEqual([
      [0, 0],
      [1, 10],
    ]);
  });

  it('treats ground-only tracks as zero-altitude tracks', () => {
    const input = [point(0, 'ground', 0), point(1, 'ground', 10)];

    expect(clipTrackToAltitudeRange(input, { min: 0, max: 0 })).toEqual([input]);
    expect(clipTrackToAltitudeRange(input, { min: 500, max: 1_000 })).toEqual([]);
  });

  it('uses the nearest endpoint ground state for interpolated boundary points', () => {
    const result = clipTrackToAltitudeRange(
      [point(0, 'ground', 0), point(2, 2_000, 20)],
      { min: 0, max: 500 },
    );

    expect(result[0]?.[1]).toEqual(expect.objectContaining({ alt: 500, ground: true }));
  });

  it('omits unknown-only tracks and does not bridge an unknown endpoint', () => {
    expect(
      clipTrackToAltitudeRange([point(0, undefined, 0), point(1, undefined, 10)], { min: 0, max: 1_000 }),
    ).toEqual([]);
    expect(
      clipTrackToAltitudeRange(
        [point(0, 500, 0), point(1, undefined, 10), point(2, 500, 20)],
        { min: 0, max: 1_000 },
      ),
    ).toEqual([]);
  });

  it('interpolates heading along the shortest angular path', () => {
    const result = clipTrackToAltitudeRange(
      [point(0, -1_000, 0, 350), point(2, 1_000, 20, 10)],
      { min: 0, max: 1_000 },
    );

    expect(result[0]?.[0]).toEqual(expect.objectContaining({ track: 0 }));
  });
});
