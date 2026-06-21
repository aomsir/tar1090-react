import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryLoader, type HistorySource } from './historyLoader';
import { historyStore } from '@/store/historyStore';
import type { AircraftSnapshot } from '@/data/types';

function makeSource(count: number): HistorySource & { frameCalls: number; receiverCalls: number } {
  let frameCalls = 0;
  let receiverCalls = 0;
  return {
    get frameCalls() {
      return frameCalls;
    },
    get receiverCalls() {
      return receiverCalls;
    },
    async getReceiver() {
      receiverCalls++;
      return { version: '1', refresh: 1000, history: count };
    },
    async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
      frameCalls++;
      return { now: 100 + n, messages: 0, aircraft: [] };
    },
  };
}

describe('HistoryLoader', () => {
  beforeEach(() => historyStore.reset());

  it('loads all frames into historyStore and reports progress', async () => {
    const source = makeSource(5);
    const onProgress = vi.fn();
    const loader = new HistoryLoader(source, 2, 2000);
    await loader.ensureLoaded(onProgress);
    expect(historyStore.frames).toHaveLength(5);
    expect(source.frameCalls).toBe(5);
    expect(onProgress).toHaveBeenCalledWith({ done: 5, total: 5 });
    expect(loader.loaded).toBe(true);
  });

  it('is single-flight: concurrent/repeat calls fetch the receiver once', async () => {
    const source = makeSource(3);
    const loader = new HistoryLoader(source, 4, 2000);
    await Promise.all([loader.ensureLoaded(), loader.ensureLoaded()]);
    await loader.ensureLoaded();
    expect(source.receiverCalls).toBe(1);
    expect(source.frameCalls).toBe(3);
  });

  it('samples frames when total exceeds maxFrames', async () => {
    const requested: number[] = [];
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 100 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        requested.push(n);
        return { now: 100 + n, messages: 0, aircraft: [] };
      },
    };
    const onProgress = vi.fn();
    // maxFrames=10, total=100 → step=10, indices=[0,10,20,...,90,99]
    const loader = new HistoryLoader(source, 4, 10);
    await loader.ensureLoaded(onProgress);
    // 10 sampled + last frame 99 = 11
    expect(requested).toHaveLength(11);
    expect(requested).toContain(0);
    expect(requested).toContain(99);
    expect(requested).not.toContain(1);
    // progress reports sampled count, not raw total
    expect(onProgress).toHaveBeenLastCalledWith({ done: 11, total: 11 });
    expect(historyStore.frames).toHaveLength(11);
  });

  it('stores frames in numeric order even when responses complete out of order', async () => {
    const resolves: Array<(v: AircraftSnapshot) => void> = [];
    let callsAwaited = 0;
    let allCalled: () => void;
    const allCalledPromise = new Promise<void>((r) => {
      allCalled = r;
    });
    let frame1DoneResolve: () => void;
    const frame1Done = new Promise<void>((r) => {
      frame1DoneResolve = r;
    });
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 2 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        return new Promise<AircraftSnapshot>((resolve) => {
          resolves[n] = (v) => {
            resolve(v);
            if (n === 1) {
              // Schedule after the worker continuation microtask
              queueMicrotask(() => frame1DoneResolve());
            }
          };
          callsAwaited++;
          if (callsAwaited === 2) allCalled();
        });
      },
    };
    const spy = vi.spyOn(historyStore, 'setFrames');
    const loader = new HistoryLoader(source, 2);
    const done = loader.ensureLoaded();
    await allCalledPromise;
    // resolve frame 1 and deterministically wait for its continuation to run
    resolves[1]!({ now: 200, messages: 0, aircraft: [{ hex: 'b', lat: 0, lon: 0 }] });
    await frame1Done;
    // now resolve frame 0 — its continuation runs after frame 1 is already in the array
    resolves[0]!({ now: 100, messages: 0, aircraft: [{ hex: 'a', lat: 0, lon: 0 }] });
    await done;
    const passedFrames = spy.mock.calls[0]![0] as AircraftSnapshot[];
    expect(passedFrames[0]!.now).toBe(100);
    expect(passedFrames[1]!.now).toBe(200);
    expect(historyStore.frames).toHaveLength(2);
    expect(historyStore.frames[0]!.now).toBe(100);
    expect(historyStore.frames[1]!.now).toBe(200);
    spy.mockRestore();
  });

  it('reuses a cached receiver and does not fetch the receiver again', async () => {
    const source = makeSource(4);
    const loader = new HistoryLoader(source, 2);
    loader.setReceiver({ version: '1', refresh: 1000, history: 4 });
    await loader.ensureLoaded();
    expect(source.receiverCalls).toBe(0);
    expect(source.frameCalls).toBe(4);
  });

  it('discards stale in-flight load after reset()', async () => {
    let staleFrame0Resolve: ((v: AircraftSnapshot) => void) | null = null;
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 2 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        if (n === 0) {
          return new Promise<AircraftSnapshot>((resolve) => {
            staleFrame0Resolve = resolve;
          });
        }
        return { now: 100 + n, messages: 0, aircraft: [] };
      },
    };
    // mock setFrames to prevent stale data from landing in the store
    const setFramesMock = vi.spyOn(historyStore, 'setFrames').mockImplementation(() => {});
    const loader = new HistoryLoader(source, 1);
    const stalePromise = loader.ensureLoaded();
    await Promise.resolve(); // let worker start and block on frame 0
    loader.reset();
    staleFrame0Resolve!({ now: 999, messages: 0, aircraft: [] });
    // wait for the stale load to fully complete
    await stalePromise;
    // stale load should NOT have written to store (generation guard)
    expect(setFramesMock).not.toHaveBeenCalled();
    expect(loader.loaded).toBe(false);
    expect(historyStore.frames).toHaveLength(0);
    setFramesMock.mockRestore();
  });

  it('loads all frames when range covers entire span', async () => {
    const requested: number[] = [];
    // 100 frames, span = 99s, range '1d' = 86400s → no frames skipped
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 100 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        requested.push(n);
        return { now: 100 + n, messages: 0, aircraft: [] };
      },
    };
    const loader = new HistoryLoader(source, 48, 2000);
    await loader.ensureLoaded(undefined, '1d');
    // range > span → startIdx stays 0 → all frames loaded
    expect(requested).toContain(0);
    expect(requested).toContain(99);
    expect(historyStore.frames.length).toBeGreaterThanOrEqual(100);
  });

  it('skips early frames when range is smaller than span', async () => {
    const requested: number[] = [];
    // 100 frames: now = n * 1000, span = 99000s, range '1d' = 86400s
    // cutoff = 99000 - 86400 = 12600 → startIdx = floor(12600/99000 * 100) = 12
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 100 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        requested.push(n);
        return { now: n * 1000, messages: 0, aircraft: [] };
      },
    };
    const loader = new HistoryLoader(source, 48, 2000);
    await loader.ensureLoaded(undefined, '1d');
    // Probe fetches frame 0, main loop starts at 12
    expect(requested).toContain(0);
    expect(requested).toContain(99);
    expect(requested).not.toContain(1);
    expect(requested).not.toContain(11);
    expect(requested).toContain(12);
    // total: frame 0 (probe cache) + frames 12..99 (main, 99 reused from cache) = 88
    expect(historyStore.frames.length).toBe(88);
  });

  it('skips more frames with shorter range', async () => {
    const requested: number[] = [];
    // 500 frames: now = n * 1000, span = 499000s, range '1d' = 86400s
    // cutoff = 499000 - 86400 = 412600 → startIdx = floor(412600/499000 * 500) = 413
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 500 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        requested.push(n);
        return { now: n * 1000, messages: 0, aircraft: [] };
      },
    };
    const loader = new HistoryLoader(source, 48, 2000);
    await loader.ensureLoaded(undefined, '1d');
    // Probe fetches frame 0 and 499, main loop starts at 413
    expect(requested).toContain(0);
    expect(requested).toContain(499);
    expect(requested).not.toContain(1);
    expect(requested).not.toContain(412);
    expect(requested).toContain(413);
    // total: frame 0 (probe cache) + frames 413..499 (main, 499 reused from cache) = 87
    expect(historyStore.frames.length).toBe(87);
  });

  it('probes first and last frame for range estimation', async () => {
    const requested: number[] = [];
    // 100 frames: now = n * 1000, span = 99000s > range '1d' = 86400s
    // Probe frames 0 and 99 fetched first (via probeCache), then main loop from 12
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 100 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        requested.push(n);
        return { now: n * 1000, messages: 0, aircraft: [] };
      },
    };
    const loader = new HistoryLoader(source, 48, 2000);
    await loader.ensureLoaded(undefined, '1d');
    // Both probe frames are in the requested list
    expect(requested).toContain(0);
    expect(requested).toContain(99);
  });

  it('falls back to unlimited when probe frame fetch fails', async () => {
    let callCount = 0;
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 5 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        callCount++;
        if (callCount <= 2) throw new Error('probe failed');
        return { now: 100 + n, messages: 0, aircraft: [] };
      },
    };
    const loader = new HistoryLoader(source, 48, 2000);
    // Should not throw; falls back to loading all frames
    await loader.ensureLoaded(undefined, '1d');
    expect(historyStore.frames.length).toBeGreaterThan(0);
  });

  it('swallows errors from stale in-flight load after reset()', async () => {
    let staleFrame0Reject: ((e: unknown) => void) | null = null;
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 1 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        if (n === 0) {
          return new Promise<AircraftSnapshot>((_resolve, reject) => {
            staleFrame0Reject = reject;
          });
        }
        return { now: 100, messages: 0, aircraft: [] };
      },
    };
    const loader = new HistoryLoader(source, 1);
    const stalePromise = loader.ensureLoaded();
    await Promise.resolve();
    loader.reset();
    staleFrame0Reject!(new Error('network'));
    await Promise.resolve();
    await Promise.resolve();
    expect(loader.loaded).toBe(false);
    expect(historyStore.frames).toHaveLength(0);
    // stale promise resolves (error caught before generation check)
    await expect(stalePromise).resolves.toBeUndefined();
  });
});
