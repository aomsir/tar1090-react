import { describe, it, expect } from 'vitest';
import { computeHistoryStats } from '@/features/stats/historyStats';
import type { AircraftSnapshot } from '@/data/types';
import { Aircraft } from '@/domain/Aircraft';
import type { PeakStats } from '@/features/playback/pTracks';

function makeAircraft(overrides: Partial<Aircraft> & { hex: string }): Aircraft {
  const ac = new Aircraft(overrides.hex);
  if (overrides.flight !== undefined) ac.flight = overrides.flight;
  if (overrides.typeCode !== undefined) ac.typeCode = overrides.typeCode;
  if (overrides.altitude !== undefined) ac.altitude = overrides.altitude;
  if (overrides.country !== undefined) ac.country = overrides.country;
  if (overrides.addrType !== undefined) ac.addrType = overrides.addrType;
  if (overrides.isMilitary !== undefined) ac.isMilitary = overrides.isMilitary;
  if (overrides.registration !== undefined) ac.registration = overrides.registration;
  if (overrides.speed !== undefined) ac.speed = overrides.speed;
  if (overrides.lat !== undefined) ac.lat = overrides.lat;
  if (overrides.lon !== undefined) ac.lon = overrides.lon;
  if (overrides.emergency !== undefined) ac.emergency = overrides.emergency;
  if (overrides.squawk !== undefined) ac.squawk = overrides.squawk;
  return ac;
}

const frames: AircraftSnapshot[] = [
  {
    now: 1000,
    messages: 10,
    aircraft: [
      { hex: 'a1', flight: 'CCA101', lat: 30, lon: 110, altitude: 35000, speed: 450 },
      { hex: 'a2', flight: 'CSN202', lat: 31, lon: 111, altitude: 8000, speed: 300 },
      { hex: 'a3', flight: 'CCA303', lat: 32, lon: 112, altitude: 'ground', speed: 15 },
    ],
  },
  {
    now: 1030,
    messages: 20,
    aircraft: [
      { hex: 'a1', flight: 'CCA101', lat: 30.1, lon: 110.1, altitude: 36000, speed: 460 },
      { hex: 'a4', flight: 'DLH400', lat: 50, lon: 8, altitude: 40000, speed: 500 },
    ],
  },
];

const allAircraft: Aircraft[] = [
  makeAircraft({
    hex: 'a1',
    flight: 'CCA101',
    typeCode: 'A333',
    altitude: 36000,
    country: 'China',
    addrType: 'adsb_icao',
    isMilitary: false,
  }),
  makeAircraft({
    hex: 'a2',
    flight: 'CSN202',
    typeCode: 'B738',
    altitude: 8000,
    country: 'China',
    addrType: 'adsb_icao',
    isMilitary: false,
  }),
  makeAircraft({
    hex: 'a3',
    flight: 'CCA303',
    typeCode: 'A333',
    altitude: 'ground',
    country: 'China',
    addrType: 'mlat',
    isMilitary: false,
  }),
  makeAircraft({
    hex: 'a4',
    flight: 'DLH400',
    typeCode: 'A359',
    altitude: 40000,
    country: 'Germany',
    addrType: 'adsb_icao',
    isMilitary: true,
  }),
];

const peakStats = new Map<string, PeakStats>([
  ['a1', { maxSpeed: 460, maxDist: 50 }],
  ['a2', { maxSpeed: 300, maxDist: 80 }],
  ['a3', { maxSpeed: 15, maxDist: 5 }],
  ['a4', { maxSpeed: 500, maxDist: 200 }],
]);

describe('computeHistoryStats', () => {
  const stats = computeHistoryStats(frames, allAircraft, peakStats);

  it('computes summary totals', () => {
    expect(stats.totalAircraft).toBe(4);
    expect(stats.uniqueCallsigns).toBe(4);
    expect(stats.militaryCount).toBe(1);
  });

  it('computes peakOnline from frames', () => {
    expect(stats.peakOnline).toBe(3); // frame 1 has 3 aircraft
  });

  it('computes type distribution sorted descending', () => {
    expect(stats.typeDistribution[0]).toEqual({ name: 'A333', count: 2 });
    expect(stats.typeDistribution).toContainEqual({ name: 'B738', count: 1 });
    expect(stats.typeDistribution).toContainEqual({ name: 'A359', count: 1 });
  });

  it('computes airline distribution from callsign prefix', () => {
    const cca = stats.airlineDistribution.find((d) => d.name === 'CCA');
    expect(cca).toEqual({ name: 'CCA', count: 2 });
    const csn = stats.airlineDistribution.find((d) => d.name === 'CSN');
    expect(csn).toEqual({ name: 'CSN', count: 1 });
  });

  it('computes country distribution', () => {
    const china = stats.countryDistribution.find((d) => d.name === 'China');
    expect(china).toEqual({ name: 'China', count: 3 });
  });

  it('computes data source distribution', () => {
    const adsb = stats.sourceDistribution.find((d) => d.name === 'ADS-B');
    expect(adsb).toEqual({ name: 'ADS-B', count: 3 });
    const mlat = stats.sourceDistribution.find((d) => d.name === 'MLAT');
    expect(mlat).toEqual({ name: 'MLAT', count: 1 });
  });

  it('computes altitude bins', () => {
    const ground = stats.altitudeBins.find((b) => b.range === 'Ground');
    expect(ground).toEqual({ range: 'Ground', count: 1 });
    const high = stats.altitudeBins.find((b) => b.range === '35-40k');
    expect(high!.count).toBeGreaterThanOrEqual(1);
  });

  it('computes speed bins from peakStats', () => {
    expect(stats.speedBins.length).toBeGreaterThan(0);
    const total = stats.speedBins.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(4); // one per aircraft
  });

  it('computes distance bins from peakStats', () => {
    expect(stats.distanceBins.length).toBeGreaterThan(0);
    const total = stats.distanceBins.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(4);
  });

  it('computes traffic timeline from frames', () => {
    expect(stats.trafficTimeline).toEqual([
      { time: 1000, count: 3 },
      { time: 1030, count: 2 },
    ]);
  });

  it('handles empty inputs', () => {
    const empty = computeHistoryStats([], [], null);
    expect(empty.totalAircraft).toBe(0);
    expect(empty.peakOnline).toBe(0);
    expect(empty.trafficTimeline).toEqual([]);
  });

  it('handles aircraft with no callsign gracefully', () => {
    const noFlight = [makeAircraft({ hex: 'x1', addrType: 'adsb_icao' })];
    const s = computeHistoryStats([], noFlight, null);
    expect(s.uniqueCallsigns).toBe(0);
    expect(s.airlineDistribution).toEqual([]);
  });

  it('renders all countries sorted by count', () => {
    const many: Aircraft[] = Array.from({ length: 16 }, (_, i) =>
      makeAircraft({
        hex: `c${i}`,
        flight: `ABC${i}`,
        typeCode: `T${i}`,
        country: `Country${i}`,
        addrType: 'adsb_icao',
        isMilitary: false,
      }),
    );
    const s = computeHistoryStats([], many, null);
    expect(s.countryDistribution.length).toBeGreaterThan(15);
    for (let i = 1; i < s.countryDistribution.length; i++) {
      expect(s.countryDistribution[i - 1].count).toBeGreaterThanOrEqual(
        s.countryDistribution[i].count,
      );
    }
  });

  it('computes peakTime as timestamp of the peak frame', () => {
    expect(stats.peakTime).toBe(1000); // frame 1 has 3 aircraft (peak)
  });

  it('keeps first frame time when peak ties', () => {
    const tied: AircraftSnapshot[] = [
      { now: 1, messages: 0, aircraft: [{ hex: 'a1', lat: 0, lon: 0 }] },
      { now: 2, messages: 0, aircraft: [{ hex: 'a2', lat: 0, lon: 0 }] },
    ];
    const s = computeHistoryStats(tied, [], null);
    expect(s.peakTime).toBe(1);
  });

  it('returns zero peakTime for empty frames', () => {
    expect(computeHistoryStats([], [], null).peakTime).toBe(0);
  });

  it('downsamples long timelines to <=200 points and preserves peak stats', () => {
    const longFrames: AircraftSnapshot[] = Array.from({ length: 401 }, (_, i) => ({
      now: 1000 + i * 30,
      messages: 0,
      aircraft:
        i === 100
          ? Array.from({ length: 99 }, (_, k) => ({ hex: `p${k}`, lat: 0, lon: 0 }))
          : [{ hex: 'a1', lat: 0, lon: 0 }],
    }));
    const s = computeHistoryStats(longFrames, [], null);
    expect(s.trafficTimeline.length).toBeLessThanOrEqual(200);
    expect(s.peakOnline).toBe(99);
    expect(s.peakTime).toBe(1000 + 100 * 30);
    expect(s.trafficTimeline.some((p) => p.count === 99)).toBe(true);
    expect(s.trafficTimeline[0].time).toBe(longFrames[0].now);
    expect(s.trafficTimeline[s.trafficTimeline.length - 1].time).toBe(
      longFrames[longFrames.length - 1].now,
    );
  });

  it('uses the original final timestamp for downsampled timelines with uneven spacing', () => {
    const unevenFrames: AircraftSnapshot[] = Array.from({ length: 401 }, (_, i) => ({
      now: i === 400 ? 999999 : 1000 + i * 30,
      messages: i,
      aircraft: [{ hex: `u${i}` }],
    }));

    const s = computeHistoryStats(unevenFrames, [], null);

    expect(s.trafficTimeline.length).toBeLessThanOrEqual(200);
    expect(s.trafficTimeline[s.trafficTimeline.length - 1].time).toBe(999999);
    expect(s.trafficTimeline[s.trafficTimeline.length - 1].time).not.toBe(1000 + 399 * 30);
  });

  it('does not downsample short timelines', () => {
    const shortFrames: AircraftSnapshot[] = [
      { now: 1, messages: 0, aircraft: [{ hex: 'a', lat: 0, lon: 0 }] },
      { now: 2, messages: 0, aircraft: [{ hex: 'b', lat: 0, lon: 0 }] },
      { now: 3, messages: 0, aircraft: [{ hex: 'c', lat: 0, lon: 0 }] },
    ];
    const s = computeHistoryStats(shortFrames, [], null);
    expect(s.trafficTimeline).toEqual([
      { time: 1, count: 1 },
      { time: 2, count: 1 },
      { time: 3, count: 1 },
    ]);
  });

  it('computes otherStats counts for identity, position, and status', () => {
    const otherAircraft: Aircraft[] = [
      // Identified: has callsign+type, no reg
      makeAircraft({
        hex: 'o1',
        flight: 'IDL1',
        typeCode: 'B738',
        addrType: 'adsb_icao',
        altitude: 35000,
        speed: 450,
        lat: 30,
        lon: 110,
      }),
      // Identified: has registration only (also counts in any)
      makeAircraft({
        hex: 'o2',
        registration: 'N12345',
        addrType: 'adsb_icao',
        altitude: 'ground',
        squawk: '7700',
        emergency: 'general',
      }),
    ];
    const s = computeHistoryStats([], otherAircraft, null);
    expect(s.otherStats).toEqual({
      identified: { any: 2, callsign: 1, type: 1, registration: 1 },
      positioned: { position: 1, speed: 1, altitude: 2 },
      status: { ground: 1, emergency: 1, squawk: 1 },
    });
  });
});
