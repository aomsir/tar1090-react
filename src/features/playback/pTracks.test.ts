import { describe, it, expect } from 'vitest';
import { buildPTracks, buildPeakStats, buildAllHistoryAircraft } from './pTracks';
import type { AircraftSnapshot } from '@/data/types';

const frames: AircraftSnapshot[] = [
  {
    now: 1000,
    messages: 1,
    aircraft: [
      { hex: 'aa', lat: 30, lon: 110, altitude: 10000, speed: 200, track: 90 },
      { hex: 'bb', lat: 31, lon: 111, altitude: 5000, speed: 150, track: 180 },
    ],
  },
  {
    now: 1010,
    messages: 2,
    aircraft: [
      { hex: 'aa', lat: 30.1, lon: 110.1, altitude: 11000, speed: 250, track: 91 },
      { hex: 'bb', lat: 31, lon: 111, altitude: 6000, speed: 180, track: 185 },
    ],
  },
  {
    now: 1020,
    messages: 3,
    aircraft: [
      { hex: 'aa', lat: 30.2, lon: 110.2, altitude: 12000, speed: 220, track: 92 },
      { hex: 'cc', lat: 32, lon: 112, altitude: 'ground', speed: 10, track: 0 },
    ],
  },
];

describe('buildPTracks', () => {
  it('groups track points by hex across all frames', () => {
    const result = buildPTracks(frames);
    expect(result.size).toBe(3);
    expect(result.get('aa')!.length).toBe(3);
    expect(result.get('bb')!.length).toBe(1); // 2nd frame same coords, deduped
    expect(result.get('cc')!.length).toBe(1);
  });

  it('builds correct TrackPoint fields', () => {
    const result = buildPTracks(frames);
    const aaFirst = result.get('aa')![0];
    expect(aaFirst).toMatchObject({
      lon: 110,
      lat: 30,
      alt: 10000,
      ts: 1000,
      track: 90,
      speed: 200,
      ground: false,
    });
  });

  it('skips aircraft without lat/lon', () => {
    const sparse: AircraftSnapshot[] = [{ now: 1, messages: 1, aircraft: [{ hex: 'xx' }] }];
    expect(buildPTracks(sparse).size).toBe(0);
  });

  it('returns empty map for empty frames', () => {
    expect(buildPTracks([]).size).toBe(0);
  });
});

describe('buildPeakStats', () => {
  it('computes max speed per hex', () => {
    const result = buildPeakStats(frames);
    expect(result.get('aa')!.maxSpeed).toBe(250);
    expect(result.get('bb')!.maxSpeed).toBe(180);
    expect(result.get('cc')!.maxSpeed).toBe(10);
  });

  it('computes max distance when site position provided', () => {
    const result = buildPeakStats(frames, 30, 110);
    expect(result.get('aa')!.maxDist).toBeGreaterThan(0);
    // bb is farther from site (30,110) than aa's first position
    expect(result.get('bb')!.maxDist).toBeGreaterThan(result.get('aa')!.maxDist!);
  });

  it('leaves maxDist undefined when no site position', () => {
    const result = buildPeakStats(frames);
    expect(result.get('aa')!.maxDist).toBeUndefined();
  });

  it('returns empty map for empty frames', () => {
    expect(buildPeakStats([]).size).toBe(0);
  });
});

describe('buildAllHistoryAircraft', () => {
  it('returns deduplicated aircraft with last-seen data', () => {
    const result = buildAllHistoryAircraft(frames);
    expect(result.length).toBe(3);
    const aa = result.find((ac) => ac.hex === 'aa')!;
    expect(aa.lat).toBe(30.2);
    expect(aa.lon).toBe(110.2);
    expect(aa.altitude).toBe(12000);
  });

  it('includes aircraft that only appear in one frame', () => {
    const result = buildAllHistoryAircraft(frames);
    const cc = result.find((ac) => ac.hex === 'cc');
    expect(cc).toBeDefined();
    expect(cc!.altitude).toBe('ground');
  });

  it('returns empty array for empty frames', () => {
    expect(buildAllHistoryAircraft([]).length).toBe(0);
  });
});
