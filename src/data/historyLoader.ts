import { PollingSource } from './pollingSource';
import { historyStore } from '@/store/historyStore';
import type { AircraftSnapshot, Receiver } from './types';

export type HistoryRange = '1d' | '3d' | '1w' | '1m' | 'unlimited';

export const HISTORY_RANGES: readonly { key: HistoryRange; label: string; seconds: number }[] = [
  { key: '1d',        label: '1 day',  seconds: 86400 },
  { key: '3d',        label: '3 days', seconds: 259200 },
  { key: '1w',        label: '1 week', seconds: 604800 },
  { key: '1m',        label: '1 month', seconds: 2592000 },
  { key: 'unlimited', label: 'All', seconds: Infinity },
];

export interface HistorySource {
  getReceiver(): Promise<Receiver>;
  getHistoryFrame(n: number): Promise<AircraftSnapshot>;
}

export interface LoadProgress {
  done: number;
  total: number;
}

export class HistoryLoader {
  private readonly source: HistorySource;
  private readonly concurrency: number;
  private readonly maxFrames: number;
  private promise: Promise<void> | null = null;
  private cachedReceiver: Receiver | null = null;
  private loadGeneration = 0;
  loaded = false;

  constructor(source?: HistorySource, concurrency = 48, maxFrames = 2000) {
    this.source = source ?? new PollingSource();
    this.concurrency = concurrency;
    this.maxFrames = maxFrames;
  }

  /** Reuse a receiver already fetched elsewhere (avoids a duplicate request). */
  setReceiver(receiver: Receiver): void {
    this.cachedReceiver = receiver;
  }

  ensureLoaded(onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (!this.promise) this.promise = this.load(onProgress);
    return this.promise;
  }

  reset(): void {
    this.promise = null;
    this.loaded = false;
    this.loadGeneration++;
  }

  private async load(onProgress?: (p: LoadProgress) => void): Promise<void> {
    const generation = this.loadGeneration;
    const receiver = this.cachedReceiver ?? (await this.source.getReceiver());
    const rawTotal = receiver.history ?? 0;

    // Sample frame indices when rawTotal exceeds maxFrames
    const step = rawTotal > this.maxFrames ? Math.ceil(rawTotal / this.maxFrames) : 1;
    const indices: number[] = [];
    for (let i = 0; i < rawTotal; i += step) indices.push(i);
    // Always include last frame so time range is complete
    if (rawTotal > 0 && indices[indices.length - 1] !== rawTotal - 1) {
      indices.push(rawTotal - 1);
    }

    const loadTotal = indices.length;
    const frames: Array<AircraftSnapshot | undefined> = new Array(loadTotal).fill(undefined);
    let done = 0;
    let next = 0;
    const worker = async (): Promise<void> => {
      for (;;) {
        const slot = next++;
        if (slot >= loadTotal) return;
        try {
          frames[slot] = await this.source.getHistoryFrame(indices[slot]!);
        } catch {
          // skip a missing/failed frame
        }
        done++;
        onProgress?.({ done, total: loadTotal });
      }
    };
    const lanes = Math.min(this.concurrency, loadTotal || 1);
    await Promise.all(Array.from({ length: lanes }, () => worker()));
    if (this.loadGeneration !== generation) return;
    historyStore.setFrames(frames.filter((f): f is AircraftSnapshot => f !== undefined));
    this.loaded = true;
  }
}

export const historyLoader = new HistoryLoader();
