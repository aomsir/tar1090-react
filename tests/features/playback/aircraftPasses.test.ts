import { describe, expect, it } from 'vitest';
import type { AircraftDTO, AircraftSnapshot } from '@/data/types';
import {
  AIRCRAFT_PASS_ISOLATION_SECONDS,
  buildAircraftPasses,
} from '@/features/playback/aircraftPasses';

const baseTime = 1_000_000;

function frame(now: number, aircraft: AircraftDTO[]): AircraftSnapshot {
  return { now, messages: 0, aircraft };
}

describe('buildAircraftPasses', () => {
  it('merges observations separated by less than twelve hours', () => {
    const passes = buildAircraftPasses([
      frame(baseTime, [{ hex: 'abc123' }]),
      frame(baseTime + AIRCRAFT_PASS_ISOLATION_SECONDS - 1, [{ hex: 'abc123' }]),
    ]);

    expect(passes).toHaveLength(1);
    expect(passes[0]).toMatchObject({
      passId: `abc123:${baseTime}`,
      hex: 'abc123',
      startTime: baseTime,
      endTime: baseTime + AIRCRAFT_PASS_ISOLATION_SECONDS - 1,
    });
  });

  it('splits observations separated by exactly twelve hours', () => {
    const passes = buildAircraftPasses([
      frame(baseTime, [{ hex: 'abc123' }]),
      frame(baseTime + AIRCRAFT_PASS_ISOLATION_SECONDS, [{ hex: 'abc123' }]),
    ]);

    expect(passes.map((pass) => pass.startTime)).toEqual([
      baseTime,
      baseTime + AIRCRAFT_PASS_ISOLATION_SECONDS,
    ]);
  });

  it('splits observations separated by more than twelve hours', () => {
    const passes = buildAircraftPasses([
      frame(baseTime, [{ hex: 'abc123' }]),
      frame(baseTime + AIRCRAFT_PASS_ISOLATION_SECONDS + 1, [{ hex: 'abc123' }]),
    ]);

    expect(passes).toHaveLength(2);
  });

  it('calculates isolation from the previous observation rather than pass start', () => {
    const interval = AIRCRAFT_PASS_ISOLATION_SECONDS - 1;
    const passes = buildAircraftPasses([
      frame(baseTime, [{ hex: 'abc123' }]),
      frame(baseTime + interval, [{ hex: 'abc123' }]),
      frame(baseTime + interval * 2, [{ hex: 'abc123' }]),
    ]);

    expect(passes).toHaveLength(1);
    expect(passes[0].endTime).toBe(baseTime + interval * 2);
  });

  it('keeps separate hex streams independent and normalizes hex casing', () => {
    const passes = buildAircraftPasses([
      frame(baseTime, [{ hex: ' AbC123 ' }, { hex: 'def456' }]),
      frame(baseTime + AIRCRAFT_PASS_ISOLATION_SECONDS, [{ hex: 'DEF456' }]),
      frame(baseTime + AIRCRAFT_PASS_ISOLATION_SECONDS + 1, [{ hex: 'ABC123' }]),
    ]);

    expect(passes.map((pass) => `${pass.hex}:${pass.startTime}`)).toEqual([
      `abc123:${baseTime}`,
      `def456:${baseTime}`,
      `def456:${baseTime + AIRCRAFT_PASS_ISOLATION_SECONDS}`,
      `abc123:${baseTime + AIRCRAFT_PASS_ISOLATION_SECONDS + 1}`,
    ]);
  });

  it('sorts copied frame input and ignores invalid frame times or hex values', () => {
    const frames = [
      frame(baseTime + 10, [{ hex: 'ABC123' }]),
      frame(baseTime, [{ hex: 'abc123' }]),
      { now: Number.NaN, messages: 0, aircraft: [{ hex: 'ignored' }] },
      { now: baseTime, messages: 0, aircraft: [{ hex: ' ' }, { hex: 123 }] },
    ] as unknown as AircraftSnapshot[];
    const originalOrder = [...frames];

    const passes = buildAircraftPasses(frames);

    expect(frames).toEqual(originalOrder);
    expect(passes).toHaveLength(1);
    expect(passes[0]).toMatchObject({ hex: 'abc123', startTime: baseTime, endTime: baseTime + 10 });
    expect(buildAircraftPasses([])).toEqual([]);
  });

  it('isolates tracks by pass and suppresses consecutive duplicate coordinates', () => {
    const passes = buildAircraftPasses([
      frame(baseTime, [{ hex: 'abc123', lat: 10, lon: 20 }]),
      frame(baseTime + 1, [{ hex: 'abc123', lat: 10, lon: 20 }]),
      frame(baseTime + 2, [{ hex: 'abc123', lat: 11, lon: 21 }]),
      frame(baseTime + AIRCRAFT_PASS_ISOLATION_SECONDS + 2, [{ hex: 'abc123', lat: 12, lon: 22 }]),
    ]);

    expect(passes.map((pass) => pass.trackPoints.map(({ lat, lon }) => [lat, lon]))).toEqual([
      [
        [10, 20],
        [11, 21],
      ],
      [[12, 22]],
    ]);
  });

  it('aggregates finite peak values and marks altitude, ground, emergency, and squawk states', () => {
    const passes = buildAircraftPasses(
      [
        frame(baseTime, [
          {
            hex: 'abc123',
            lat: 0,
            lon: 1,
            altitude: 1_000,
            speed: 100,
            emergency: ' none ',
            squawk: ' ',
          },
        ]),
        frame(baseTime + 1, [
          {
            hex: 'abc123',
            lat: 0,
            lon: 2,
            altitude: 'ground',
            speed: 200,
            emergency: 'general',
            squawk: '7700',
          },
        ]),
        frame(baseTime + 2, [
          { hex: 'abc123', lat: 0, lon: 3, altitude: Number.NaN, speed: Number.POSITIVE_INFINITY },
        ]),
      ],
      { siteLat: 0, siteLon: 0 },
    );

    expect(passes[0]).toMatchObject({
      maxAltitude: 1_000,
      maxSpeed: 200,
      hadAltitude: true,
      hadGround: true,
      hadEmergency: true,
      hadSquawk: true,
    });
    expect(passes[0].maxDistance).toBeGreaterThan(100);
  });

  it('retains ground-only and positionless passes without unavailable peak values', () => {
    const passes = buildAircraftPasses([
      frame(baseTime, [{ hex: 'ground', altitude: 'ground' }]),
      frame(baseTime, [{ hex: 'sparse', flight: 'TEST123' }]),
    ]);

    expect(passes).toHaveLength(2);
    expect(passes[0]).toMatchObject({
      hex: 'ground',
      hadAltitude: true,
      hadGround: true,
      trackPoints: [],
    });
    expect(passes[0].maxAltitude).toBeUndefined();
    expect(passes[1]).toMatchObject({ hex: 'sparse', trackPoints: [] });
    expect(passes[1].maxDistance).toBeUndefined();
  });
});
