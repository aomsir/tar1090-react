import { describe, it, expect } from 'vitest';
import { extractTrackPoints } from './track';
import type { AircraftSnapshot } from '@/data/types';

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
