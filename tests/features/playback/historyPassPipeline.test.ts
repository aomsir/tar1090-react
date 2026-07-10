import { describe, expect, it } from 'vitest';
import type { AircraftDTO, AircraftSnapshot } from '@/data/types';
import { buildPassRows, type RowQuery } from '@/features/list/aircraftRows';
import {
  AIRCRAFT_PASS_ISOLATION_SECONDS,
  buildAircraftPasses,
} from '@/features/playback/aircraftPasses';
import { computeHistoryStats } from '@/features/stats/historyStats';

function frame(now: number, aircraft: AircraftDTO[]): AircraftSnapshot {
  return { now, messages: 0, aircraft };
}

const passTimeQuery: RowQuery = {
  query: '',
  filter: 'all',
  sortKey: 'pass_time',
  sortDir: 'asc',
  inViewOnly: false,
  extent: null,
};

describe('history pass pipeline', () => {
  it('keeps isolated passes distinct through rows, tracks, and statistics', () => {
    const start = 1_000_000;
    const frames = [
      frame(start, [{ hex: 'abc123', altitude: 10_000, lat: 10, lon: 20 }]),
      frame(start + 60, [{ hex: 'abc123', altitude: 12_000, lat: 11, lon: 21 }]),
      frame(start + 60 + AIRCRAFT_PASS_ISOLATION_SECONDS, [
        { hex: 'abc123', altitude: 24_000, lat: 30, lon: 40 },
        { hex: 'def456', altitude: 18_000, lat: 50, lon: 60 },
      ]),
      frame(start + 120 + AIRCRAFT_PASS_ISOLATION_SECONDS, [
        { hex: 'abc123', altitude: 25_000, lat: 31, lon: 41 },
        { hex: 'def456', altitude: 19_000, lat: 51, lon: 61 },
      ]),
    ];

    const passes = buildAircraftPasses(frames);
    const rows = buildPassRows(passes, passTimeQuery);
    const stats = computeHistoryStats(frames, passes);
    const abcPasses = passes.filter((pass) => pass.hex === 'abc123');

    expect(rows.map((row) => row.rowId)).toEqual([
      `abc123:${start}`,
      `abc123:${start + 60 + AIRCRAFT_PASS_ISOLATION_SECONDS}`,
      `def456:${start + 60 + AIRCRAFT_PASS_ISOLATION_SECONDS}`,
    ]);
    expect(new Set(rows.map((row) => row.rowId)).size).toBe(3);
    expect(abcPasses.map((pass) => pass.maxAltitude)).toEqual([12_000, 25_000]);
    expect(abcPasses[0].trackPoints).not.toBe(abcPasses[1].trackPoints);
    expect(abcPasses.map((pass) => pass.trackPoints.map(({ lat, lon }) => [lat, lon]))).toEqual([
      [
        [10, 20],
        [11, 21],
      ],
      [
        [30, 40],
        [31, 41],
      ],
    ]);
    expect(stats).toMatchObject({ totalPasses: 3, uniqueAircraft: 2 });
  });
});
