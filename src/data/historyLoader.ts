import { PollingSource } from './pollingSource';
import { historyStore } from '@/store/historyStore';
import type { AircraftSnapshot, Receiver } from './types';

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
  private promise: Promise<void> | null = null;
  loaded = false;

  constructor(source?: HistorySource, concurrency = 12) {
    this.source = source ?? new PollingSource();
    this.concurrency = concurrency;
  }

  ensureLoaded(onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (!this.promise) this.promise = this.load(onProgress);
    return this.promise;
  }

  reset(): void {
    this.promise = null;
    this.loaded = false;
  }

  private async load(onProgress?: (p: LoadProgress) => void): Promise<void> {
    const receiver = await this.source.getReceiver();
    const total = receiver.history ?? 0;
    const frames: AircraftSnapshot[] = [];
    let done = 0;
    let next = 0;
    const worker = async (): Promise<void> => {
      for (;;) {
        const n = next++;
        if (n >= total) return;
        try {
          frames.push(await this.source.getHistoryFrame(n));
        } catch {
          // skip a missing/failed frame
        }
        done++;
        onProgress?.({ done, total });
      }
    };
    const lanes = Math.min(this.concurrency, total || 1);
    await Promise.all(Array.from({ length: lanes }, () => worker()));
    historyStore.setFrames(frames);
    this.loaded = true;
  }
}

export const historyLoader = new HistoryLoader();
