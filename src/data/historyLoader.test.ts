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
});
