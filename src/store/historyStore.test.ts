import { describe, it, expect, beforeEach } from 'vitest';
import { historyStore } from './historyStore';
import type { AircraftSnapshot } from '@/data/types';

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
