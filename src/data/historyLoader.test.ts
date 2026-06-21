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

  it('uses the explicit constructor concurrency when provided', async () => {
    const source = makeSource(3);
    const loader = new HistoryLoader(source, 1);
    await loader.ensureLoaded();
    expect(source.frameCalls).toBe(3);
  });

  it('defaults concurrency to HISTORY_LOAD_CONCURRENCY when not specified', async () => {
    const { HISTORY_LOAD_CONCURRENCY } = await import('@/config/history');
    const loader = new HistoryLoader(makeSource(1));
    expect((loader as HistoryLoader & { concurrency: number }).concurrency).toBe(HISTORY_LOAD_CONCURRENCY);
  });

  it('loads all frames into historyStore and reports progress', async () => {
    const source = makeSource(5);
    const onProgress = vi.fn();
    const loader = new HistoryLoader(source, 2);
    await loader.ensureLoaded(onProgress);
    expect(historyStore.frames).toHaveLength(5);
    expect(source.frameCalls).toBe(5);
    expect(onProgress).toHaveBeenCalledWith({ done: 5, total: 5 });
    expect(loader.loaded).toBe(true);
  });

  it('is single-flight: concurrent/repeat calls fetch the receiver once', async () => {
    const source = makeSource(3);
    const loader = new HistoryLoader(source, 4);
    await Promise.all([loader.ensureLoaded(), loader.ensureLoaded()]);
    await loader.ensureLoaded();
    expect(source.receiverCalls).toBe(1);
    expect(source.frameCalls).toBe(3);
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

  it('loads the last 2880 files for 1d range', async () => {
    const requested: number[] = [];
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 5000 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        requested.push(n);
        return { now: n, messages: 0, aircraft: [] };
      },
    };

    const loader = new HistoryLoader(source, 8);
    await loader.ensureLoaded(undefined, '1d');

    expect(requested).toHaveLength(2880);
    expect(requested[0]).toBe(2120);
    expect(requested[2879]).toBe(4999);
    expect(requested).not.toContain(2119);
    expect(historyStore.frames).toHaveLength(2880);
  });

  it('loads the last 8640 files for 3d range', async () => {
    const requested: number[] = [];
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 10000 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        requested.push(n);
        return { now: n, messages: 0, aircraft: [] };
      },
    };

    const loader = new HistoryLoader(source, 8);
    await loader.ensureLoaded(undefined, '3d');

    expect(requested).toHaveLength(8640);
    expect(requested[0]).toBe(1360);
    expect(requested[8639]).toBe(9999);
    expect(requested).not.toContain(1359);
  });

  it('loads all files when total is smaller than requested range', async () => {
    const requested: number[] = [];
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 14223 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        requested.push(n);
        return { now: n, messages: 0, aircraft: [] };
      },
    };

    const loader = new HistoryLoader(source, 8);
    await loader.ensureLoaded(undefined, '1w');

    expect(requested).toHaveLength(14223);
    expect(requested[0]).toBe(0);
    expect(requested[14222]).toBe(14222);
  });

  it('loads all files for unlimited range', async () => {
    const requested: number[] = [];
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 25 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        requested.push(n);
        return { now: n, messages: 0, aircraft: [] };
      },
    };

    const loader = new HistoryLoader(source, 4);
    await loader.ensureLoaded(undefined, 'unlimited');

    expect(requested).toHaveLength(25);
    expect(requested[0]).toBe(0);
    expect(requested[24]).toBe(24);
  });

  it('requests contiguous indices with no sampling gaps', async () => {
    const requested: number[] = [];
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 2890 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        requested.push(n);
        return { now: n, messages: 0, aircraft: [] };
      },
    };

    const loader = new HistoryLoader(source, 8);
    await loader.ensureLoaded(undefined, '1d');

    expect(requested[0]).toBe(10);
    expect(requested[1]).toBe(11);
    expect(requested[2]).toBe(12);
    expect(requested[requested.length - 1]).toBe(2889);
    for (let i = 1; i < requested.length; i++) {
      expect(requested[i]).toBe(requested[i - 1]! + 1);
    }
  });

  it('skips failed files but continues loading the rest of a contiguous range', async () => {
    const requested: number[] = [];
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 12 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        requested.push(n);
        if (n === 9) throw new Error('missing frame');
        return { now: n, messages: 0, aircraft: [] };
      },
    };

    const loader = new HistoryLoader(source, 4);
    await loader.ensureLoaded(undefined, 'unlimited');

    expect(requested).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(historyStore.frames).toHaveLength(11);
    expect(historyStore.frames.some((frame) => frame.now === 9)).toBe(false);
  });
});
