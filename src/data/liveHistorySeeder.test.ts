import { describe, it, expect, beforeEach } from 'vitest';
import type { AircraftSnapshot } from './types';
import {
  loadLiveHistory,
  getHistorySeed,
  useSeedVersion,
  clearHistorySeedForTest,
} from './liveHistorySeeder';

function makeGetFrame(frames: Record<number, AircraftSnapshot>) {
  return async (n: number): Promise<AircraftSnapshot> => {
    const f = frames[n];
    if (!f) throw new Error(`no frame ${n}`);
    return f;
  };
}

describe('liveHistorySeeder', () => {
  beforeEach(() => {
    clearHistorySeedForTest();
  });

  it('does nothing when historyCount <= 0', async () => {
    await loadLiveHistory(makeGetFrame({}), 0);
    expect(getHistorySeed('abc')).toBeUndefined();
    expect(useSeedVersion.getState().version).toBe(0);
  });

  it('fetches only the latest maxFrames history files', async () => {
    const requested: number[] = [];
    const getFrame = async (n: number): Promise<AircraftSnapshot> => {
      requested.push(n);
      return { now: 1000 + n, messages: 0, aircraft: [] };
    };
    await loadLiveHistory(getFrame, 5000, 3);
    expect(requested.sort((a, b) => a - b)).toEqual([4997, 4998, 4999]);
  });

  it('builds position records for aircraft with lat/lon', async () => {
    const frames: Record<number, AircraftSnapshot> = {
      0: {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: 'abc', lat: 10, lon: 20, altitude: 5000, track: 90, speed: 400 },
        ],
      },
      1: {
        now: 130,
        messages: 0,
        aircraft: [
          { hex: 'abc', lat: 11, lon: 21, altitude: 6000, track: 95, speed: 410 },
        ],
      },
    };
    await loadLiveHistory(makeGetFrame(frames), 2, 2000);
    const pts = getHistorySeed('abc');
    expect(pts).toHaveLength(2);
    expect(pts![0]).toEqual({
      lon: 20, lat: 10, alt: 5000, ts: 100, track: 90, speed: 400, ground: false,
    });
    expect(pts![1]).toEqual({
      lon: 21, lat: 11, alt: 6000, ts: 130, track: 95, speed: 410, ground: false,
    });
  });

  it('skips aircraft without lat/lon', async () => {
    const frames: Record<number, AircraftSnapshot> = {
      0: {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: 'nopos', altitude: 5000 },
          { hex: 'haspos', lat: 1, lon: 2 },
        ],
      },
    };
    await loadLiveHistory(makeGetFrame(frames), 1, 2000);
    expect(getHistorySeed('nopos')).toBeUndefined();
    expect(getHistorySeed('haspos')).toHaveLength(1);
  });

  it('deduplicates adjacent same-position entries', async () => {
    const frames: Record<number, AircraftSnapshot> = {
      0: { now: 100, messages: 0, aircraft: [{ hex: 'a', lat: 10, lon: 20 }] },
      1: { now: 130, messages: 0, aircraft: [{ hex: 'a', lat: 10, lon: 20 }] },
      2: { now: 160, messages: 0, aircraft: [{ hex: 'a', lat: 11, lon: 21 }] },
    };
    await loadLiveHistory(makeGetFrame(frames), 3, 2000);
    const pts = getHistorySeed('a');
    expect(pts).toHaveLength(2);
    expect(pts![0]!.ts).toBe(100);
    expect(pts![1]!.ts).toBe(160);
  });

  it('handles ground altitude correctly', async () => {
    const frames: Record<number, AircraftSnapshot> = {
      0: {
        now: 100, messages: 0,
        aircraft: [{ hex: 'g', lat: 1, lon: 2, altitude: 'ground' as const }],
      },
    };
    await loadLiveHistory(makeGetFrame(frames), 1, 2000);
    const pts = getHistorySeed('g');
    expect(pts![0]!.ground).toBe(true);
    expect(pts![0]!.alt).toBe('ground');
  });

  it('skips failed frame fetches gracefully', async () => {
    let calls = 0;
    const getFrame = async (n: number): Promise<AircraftSnapshot> => {
      calls++;
      if (n === 1) throw new Error('network error');
      return {
        now: 100 + n * 30,
        messages: 0,
        aircraft: [{ hex: 'a', lat: n, lon: n * 2 }],
      };
    };
    await loadLiveHistory(getFrame, 3, 2000);
    expect(calls).toBe(3);
    const pts = getHistorySeed('a');
    expect(pts).toHaveLength(2);
  });

  it('bumps seed version after loading', async () => {
    expect(useSeedVersion.getState().version).toBe(0);
    await loadLiveHistory(makeGetFrame({
      0: { now: 100, messages: 0, aircraft: [] },
    }), 1, 2000);
    expect(useSeedVersion.getState().version).toBeGreaterThan(0);
  });

  it('sets loading=true during fetch and loading=false after completion', async () => {
    expect(useSeedVersion.getState().loading).toBe(false);

    let resolveFrame!: (v: AircraftSnapshot) => void;
    const getFrame = () =>
      new Promise<AircraftSnapshot>((r) => {
        resolveFrame = r;
      });

    const promise = loadLiveHistory(getFrame, 1, 2000);

    expect(useSeedVersion.getState().loading).toBe(true);

    resolveFrame({ now: 100, messages: 0, aircraft: [] });
    await promise;

    expect(useSeedVersion.getState().loading).toBe(false);
  });

  it('does not set loading when historyCount <= 0', async () => {
    await loadLiveHistory(makeGetFrame({}), 0);
    expect(useSeedVersion.getState().loading).toBe(false);
  });

  it('normalizes hex to lowercase for lookup', async () => {
    const frames: Record<number, AircraftSnapshot> = {
      0: { now: 100, messages: 0, aircraft: [{ hex: 'AbC', lat: 1, lon: 2 }] },
    };
    await loadLiveHistory(makeGetFrame(frames), 1, 2000);
    expect(getHistorySeed('abc')).toHaveLength(1);
    expect(getHistorySeed('ABC')).toHaveLength(1);
  });
});
