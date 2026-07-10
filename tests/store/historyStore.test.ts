import { describe, it, expect, beforeEach, vi } from 'vitest';
import { historyStore } from '@/store/historyStore';
import { useLiveTick } from '@/store/liveTick';
import type { AircraftSnapshot } from '@/data/types';

const { enrichAircraft, routeService } = vi.hoisted(() => ({
  enrichAircraft: vi.fn(async () => {}),
  routeService: {
    enqueue: vi.fn(),
    flush: vi.fn(async () => {}),
  },
}));

vi.mock('@/domain/enrich', () => ({
  enrichAircraft,
}));

vi.mock('@/data/routeService', () => ({ routeService }));

const frame = (now: number, ac: Record<string, unknown>[] = []): AircraftSnapshot => ({
  now,
  messages: 0,
  aircraft: ac as unknown as AircraftSnapshot['aircraft'],
});

describe('historyStore', () => {
  beforeEach(() => historyStore.reset());

  it('sorts frames by now and reports bounds', () => {
    historyStore.setFrames([frame(300), frame(100), frame(200)]);
    expect(historyStore.timeBounds()).toEqual({ min: 100, max: 300 });
  });

  it('frameAt returns nearest frame with now <= t (clamped at ends)', () => {
    historyStore.setFrames([frame(100), frame(200), frame(300)]);
    expect(historyStore.frameAt(50)?.now).toBe(100);
    expect(historyStore.frameAt(250)?.now).toBe(200);
    expect(historyStore.frameAt(300)?.now).toBe(300);
    expect(historyStore.frameAt(9999)?.now).toBe(300);
  });

  it('extractFrameAircraft builds positioned Aircraft from the nearest frame', () => {
    historyStore.setFrames([frame(200, [{ hex: 'abc', lat: 1, lon: 2, altitude: 1000 }])]);
    const list = historyStore.extractFrameAircraft(250);
    expect(list).toHaveLength(1);
    expect(list[0].hex).toBe('abc');
    expect(list[0].hasPosition()).toBe(true);
  });

  it('returns null bounds / empty list when empty', () => {
    expect(historyStore.timeBounds()).toBeNull();
    expect(historyStore.extractFrameAircraft(0)).toEqual([]);
  });
});

describe('pass data', () => {
  beforeEach(() => {
    historyStore.reset();
    enrichAircraft.mockReset();
    enrichAircraft.mockResolvedValue(undefined);
    routeService.enqueue.mockClear();
    routeService.flush.mockClear();
  });

  it('buildPassData populates only canonical pass data', async () => {
    const frames: AircraftSnapshot[] = [
      {
        now: 1000,
        messages: 1,
        aircraft: [{ hex: 'aa', lat: 30, lon: 110, altitude: 10000, speed: 200 }],
      },
    ];
    historyStore.setFrames(frames);
    await historyStore.buildPassData();
    expect(historyStore.passes).toHaveLength(1);
    expect(historyStore.passTracksData?.size).toBe(1);
  });

  it('buildPassData stores canonical passes, pass keyed tracks, and supports pass lookup', async () => {
    historyStore.setFrames([
      frame(1000, [{ hex: 'aa', lat: 30, lon: 110, altitude: 10000, speed: 200 }]),
      frame(1000 + 12 * 60 * 60, [{ hex: 'aa', lat: 31, lon: 111, altitude: 11000, speed: 220 }]),
    ]);

    await historyStore.buildPassData();

    expect(historyStore.passes).toHaveLength(2);
    expect(historyStore.passTracksData).toBeInstanceOf(Map);
    expect(historyStore.passTracksData?.size).toBe(2);
    expect(historyStore.getPass(historyStore.passes[0].passId)).toBe(historyStore.passes[0]);
    expect(historyStore.getPass(null)).toBeNull();
    expect(historyStore.getPass('missing')).toBeNull();
  });

  it('buildPassData caches drawable passes with the most recent first', async () => {
    historyStore.setFrames([
      frame(1000, [{ hex: 'older', lat: 30, lon: 110 }]),
      frame(1001, [{ hex: 'older', lat: 31, lon: 111 }]),
      frame(1000 + 12 * 60 * 60, [{ hex: 'newer', lat: 40, lon: 120 }]),
      frame(1001 + 12 * 60 * 60, [{ hex: 'newer', lat: 41, lon: 121 }]),
      frame(1002 + 12 * 60 * 60, [{ hex: 'single', lat: 50, lon: 130 }]),
    ]);

    await historyStore.buildPassData();

    expect(historyStore.drawablePassesRecentFirst.map(({ hex }) => hex)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('clearPassData resets canonical pass fields', async () => {
    const frames: AircraftSnapshot[] = [
      {
        now: 1000,
        messages: 1,
        aircraft: [{ hex: 'aa', lat: 30, lon: 110, altitude: 10000, speed: 200 }],
      },
    ];
    historyStore.setFrames(frames);
    await historyStore.buildPassData();
    historyStore.clearPassData();
    expect(historyStore.passes).toEqual([]);
    expect(historyStore.passTracksData).toBeNull();
    expect(historyStore.drawablePassesRecentFirst).toEqual([]);
  });

  it('clearPassData resets canonical pass fields and history statistics', async () => {
    historyStore.setFrames([frame(1000, [{ hex: 'aa', lat: 30, lon: 110, altitude: 10000 }])]);
    await historyStore.buildPassData();

    historyStore.clearPassData();

    expect(historyStore.passes).toEqual([]);
    expect(historyStore.passTracksData).toBeNull();
    expect(historyStore.getPass('aa:1000')).toBeNull();
  });

  it('queues each non-empty normalized callsign once across passes', async () => {
    historyStore.setFrames([
      frame(1000, [{ hex: 'aa', flight: ' test100 ' }]),
      frame(1000 + 12 * 60 * 60, [
        { hex: 'aa', flight: 'TEST100' },
        { hex: 'bb', flight: ' ' },
      ]),
    ]);

    await historyStore.buildPassData(undefined, undefined, true);

    expect(routeService.enqueue).toHaveBeenCalledTimes(1);
    expect(routeService.enqueue).toHaveBeenCalledWith('TEST100');
    expect(routeService.flush).toHaveBeenCalledTimes(1);
  });

  it('frameInterval returns median gap between consecutive frames', () => {
    historyStore.setFrames([frame(100), frame(130), frame(160), frame(190), frame(220)]);
    expect(historyStore.frameInterval()).toBe(30);
  });

  it('frameInterval defaults to 30 when fewer than 2 frames', () => {
    historyStore.setFrames([frame(100)]);
    expect(historyStore.frameInterval()).toBe(30);
  });

  it('bumps liveTick once after buildPassData so pass views re-render', async () => {
    const before = useLiveTick.getState().version;
    const frames: AircraftSnapshot[] = [
      {
        now: 1000,
        messages: 1,
        aircraft: [{ hex: 'aa', lat: 30, lon: 110, altitude: 10000, speed: 200 }],
      },
    ];
    historyStore.setFrames(frames);
    await historyStore.buildPassData();
    const after = useLiveTick.getState().version;
    expect(after).toBe(before + 1);
  });
});
