import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAircraftTraceCacheForTest,
  loadAircraftTrace,
  mergeTracePoints,
  parseTraceResponse,
  traceFilePath,
} from '@/features/track/aircraftTrace';

const jsonResponse = (body: unknown, ok = true): Response =>
  ({ ok, json: vi.fn(async () => body) }) as unknown as Response;

describe('aircraftTrace', () => {
  beforeEach(() => {
    clearAircraftTraceCacheForTest();
  });

  it('builds tar1090 full and recent trace paths from the selected hex', () => {
    expect(traceFilePath('ABC123', 'full')).toBe('/data/traces/23/trace_full_abc123.json');
    expect(traceFilePath('ABC123', 'recent')).toBe('/data/traces/23/trace_recent_abc123.json');
  });

  it('parses trace entries into TrackPoint values with absolute timestamps', () => {
    const points = parseTraceResponse({
      timestamp: 1000,
      trace: [
        [0, 10, 20, 3000, 250, 90, 0],
        [30, 11, 21, 'ground', 5, 180, 0],
        [60, null, 22, 5000, 260, 95, 0],
      ],
    });

    expect(points).toEqual([
      { ts: 1000, lat: 10, lon: 20, alt: 3000, speed: 250, track: 90, ground: false },
      { ts: 1030, lat: 11, lon: 21, alt: 'ground', speed: 5, track: 180, ground: true },
    ]);
  });

  it('merges, sorts, and deduplicates trace and tail points', () => {
    const merged = mergeTracePoints([
      { ts: 20, lat: 2, lon: 2, alt: 1000, ground: false },
      { ts: 10, lat: 1, lon: 1, alt: 1000, ground: false },
      { ts: 20, lat: 2, lon: 2, alt: 1000, ground: false },
      { ts: 20, lat: 3, lon: 3, alt: 1000, ground: false },
    ]);

    expect(merged.map((p) => [p.ts, p.lon, p.lat])).toEqual([
      [10, 1, 1],
      [20, 2, 2],
      [20, 3, 3],
    ]);
  });

  it('loads full and recent traces, tolerating one failed request', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ timestamp: 1000, trace: [[0, 1, 2, 1000, 200, 90, 0]] }),
      )
      .mockResolvedValueOnce(jsonResponse({}, false));

    const points = await loadAircraftTrace('ABC123', fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(String(fetchFn.mock.calls[0]![0])).toContain(
      '/data/traces/23/trace_full_abc123.json?_=',
    );
    expect(String(fetchFn.mock.calls[1]![0])).toContain(
      '/data/traces/23/trace_recent_abc123.json?_=',
    );
    expect(points.map((p) => [p.ts, p.lon, p.lat])).toEqual([[1000, 2, 1]]);
  });

  it('caches loaded traces by normalized hex', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ timestamp: 1000, trace: [[0, 1, 2, 1000, 200, 90, 0]] }));

    const first = await loadAircraftTrace('ABC123', fetchFn);
    const second = await loadAircraftTrace('abc123', fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(second).toBe(first);
  });
});
