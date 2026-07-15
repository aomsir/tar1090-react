import { describe, expect, it } from 'vitest';
import type { AircraftSnapshot } from '@/data/types';
import { buildAircraftPasses, type AircraftPass } from '@/features/playback/aircraftPasses';
import { computeHistoryStats } from '@/features/stats/historyStats';

function frame(now: number, aircraft: AircraftSnapshot['aircraft']): AircraftSnapshot {
  return { now, messages: 0, aircraft };
}

function passFixtures(): { frames: AircraftSnapshot[]; passes: AircraftPass[] } {
  const frames = [
    frame(1000, [
      {
        hex: 'aa',
        flight: 'CCA100',
        lat: 30,
        lon: 110,
        altitude: 12000,
        speed: 220,
        squawk: '7700',
        addr_type: 'adsb_icao',
      },
      { hex: 'bb', flight: 'TEST200', lat: 31, lon: 111, altitude: 25000, speed: 300 },
    ]),
    frame(1000 + 12 * 60 * 60, [
      {
        hex: 'aa',
        flight: 'CCA100',
        lat: 32,
        lon: 112,
        altitude: 12000,
        speed: 180,
        squawk: '7600',
      },
    ]),
    frame(1000 + 12 * 60 * 60 + 1, [
      {
        hex: 'aa',
        flight: 'CCA100',
        lat: 32,
        lon: 112,
        altitude: 'ground',
        speed: 180,
        emergency: 'general',
      },
    ]),
  ];
  const passes = buildAircraftPasses(frames, { siteLat: 0, siteLon: 0 });
  passes[0].aircraft.typeCode = 'A333';
  passes[0].aircraft.country = 'China';
  passes[0].aircraft.isMilitary = true;
  passes[1].aircraft.typeCode = 'A333';
  passes[1].aircraft.country = 'China';
  passes[1].aircraft.isMilitary = true;
  passes[2].aircraft.typeCode = 'B738';
  passes[2].aircraft.country = 'United States';
  return { frames, passes };
}

describe('computeHistoryStats', () => {
  it('uses aircraft passes for summary, identity categories, histograms, coverage, and status', () => {
    const { frames, passes } = passFixtures();

    const stats = computeHistoryStats(frames, passes);

    expect(stats).toMatchObject({
      totalPasses: 3,
      uniqueAircraft: 2,
      uniqueCallsigns: 2,
      militaryPasses: 2,
      otherStats: {
        identified: { callsign: 3 },
        positioned: { position: 3, speed: 3, altitude: 3 },
        status: { ground: 1, emergency: 1, squawk: 2 },
      },
    });
    expect(stats.typeDistribution).toContainEqual({ name: 'A333', count: 2 });
    expect(stats.countryDistribution).toContainEqual({ name: 'China', count: 2 });
    expect(stats.speedBins.reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
    expect(stats.distanceBins.reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
    expect(stats.altitudeBins.reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
  });

  it('counts ground status while binning a numeric maximum altitude without a Ground bin', () => {
    const { frames, passes } = passFixtures();
    passes[1].maxAltitude = 12000;

    const stats = computeHistoryStats(frames, passes);

    expect(stats.otherStats.status.ground).toBe(1);
    expect(stats.altitudeBins).toContainEqual({ range: '10-15k', count: 3 });
    expect(stats.altitudeBins.some((bin) => bin.range === 'Ground')).toBe(false);
  });

  it('keeps raw-frame first-tie peak and downsampled final timestamp semantics', () => {
    const frames = Array.from({ length: 401 }, (_, index) => ({
      now: index === 400 ? 999999 : 1000 + index * 30,
      messages: 0,
      aircraft: index === 100 ? [{ hex: 'peak' }, { hex: 'other' }] : [{ hex: `a${index}` }],
    }));
    const stats = computeHistoryStats(frames, []);

    expect(stats.peakOnline).toBe(2);
    expect(stats.peakTime).toBe(1000 + 100 * 30);
    expect(stats.trafficTimeline.length).toBeLessThanOrEqual(200);
    expect(stats.trafficTimeline.at(-1)?.time).toBe(999999);
  });

  it('ignores non-finite frame times consistently with pass preprocessing', () => {
    const stats = computeHistoryStats(
      [frame(1000, [{ hex: 'valid' }]), frame(Number.NaN, [{ hex: 'invalid' }])],
      [],
    );

    expect(stats.trafficTimeline).toEqual([{ time: 1000, count: 1 }]);
  });
});
