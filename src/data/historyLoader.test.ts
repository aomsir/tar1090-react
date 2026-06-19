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
    const source: HistorySource = {
      async getReceiver() {
        return { version: '1', refresh: 1000, history: 2 };
      },
      async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
        return new Promise<AircraftSnapshot>((resolve) => {
          resolves[n] = resolve;
          callsAwaited++;
          if (callsAwaited === 2) allCalled();
        });
      },
    };
    const spy = vi.spyOn(historyStore, 'setFrames');
    const loader = new HistoryLoader(source, 2);
    const done = loader.ensureLoaded();
    await allCalledPromise;
    // resolve frame 1 first, yield so its continuation runs
    resolves[1]!({ now: 200, messages: 0, aircraft: [{ hex: 'b', lat: 0, lon: 0 }] });
    await new Promise((r) => setTimeout(r, 10));
    // now resolve frame 0 — its continuation runs after frame 1
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
});
