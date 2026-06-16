import type { AircraftDataSource, SnapshotHandler } from './source';
import type { AircraftSnapshot, Receiver } from './types';
import { apiUrl, withCacheBust } from '@/config/api';

const RECEIVER_PATH = '/data/receiver.json';
const AIRCRAFT_PATH = '/data/aircraft.json';
const DEFAULT_REFRESH_MS = 1000;

export interface PollingOptions {
  fetchFn?: typeof fetch;
  refreshMs?: number;
}

export class PollingSource implements AircraftDataSource {
  private readonly fetchFn: typeof fetch;
  private refreshMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private stopped = true;

  constructor(opts: PollingOptions = {}) {
    this.fetchFn = opts.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
    this.refreshMs = opts.refreshMs ?? DEFAULT_REFRESH_MS;
  }

  setRefresh(ms: number): void {
    if (ms > 0) this.refreshMs = ms;
  }

  async getReceiver(): Promise<Receiver> {
    const res = await this.fetchFn(apiUrl(withCacheBust(RECEIVER_PATH)));
    return (await res.json()) as Receiver;
  }

  subscribe(handler: SnapshotHandler): () => void {
    this.stopped = false;
    void this.tick(handler);
    return () => {
      this.stopped = true;
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
    };
  }

  private async tick(handler: SnapshotHandler): Promise<void> {
    if (this.stopped || this.inFlight) return;
    this.inFlight = true;
    try {
      const res = await this.fetchFn(apiUrl(withCacheBust(AIRCRAFT_PATH)));
      const snap = (await res.json()) as AircraftSnapshot;
      if (!this.stopped) handler(snap);
    } catch {
      // swallow single-fetch error, retry next tick
    } finally {
      this.inFlight = false;
      if (!this.stopped) {
        this.timer = setTimeout(() => void this.tick(handler), this.refreshMs);
      }
    }
  }
}
