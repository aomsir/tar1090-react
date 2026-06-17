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
});
