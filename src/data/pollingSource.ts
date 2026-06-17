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
  private generation = 0;

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

  async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
    const res = await this.fetchFn(apiUrl(withCacheBust(`/data/history_${n}.json`)));
    return (await res.json()) as AircraftSnapshot;
  }

  subscribe(handler: SnapshotHandler): () => void {
    this.stopped = false;
    const gen = ++this.generation;
    void this.tick(handler, gen);
    return () => {
      this.generation++;
      this.stopped = true;
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
    };
  }

  private async tick(handler: SnapshotHandler, gen: number): Promise<void> {
    if (this.stopped || this.inFlight) return;
    this.inFlight = true;
    try {
      const res = await this.fetchFn(apiUrl(withCacheBust(AIRCRAFT_PATH)));
      const snap = (await res.json()) as AircraftSnapshot;
      if (!this.stopped && gen === this.generation) handler(snap);
    } catch {
      // swallow single-fetch error, retry next tick
    } finally {
      this.inFlight = false;
      if (!this.stopped && gen === this.generation) {
        this.timer = setTimeout(() => void this.tick(handler, gen), this.refreshMs);
      }
    }
  }
}
