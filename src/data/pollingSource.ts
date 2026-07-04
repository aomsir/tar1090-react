import type { AircraftDataSource, SnapshotHandler } from './source';
import type { AircraftSnapshot, Receiver } from './types';
import { apiUrl, withCacheBust } from '@/config/api';

const RECEIVER_PATH = '/data/receiver.json';
const AIRCRAFT_PATH = '/data/aircraft.json';
const DEFAULT_REFRESH_MS = 1000;

export interface PollingOptions {
  fetchFn?: typeof fetch;
  refreshMs?: number;
  onUnauthorized?: () => void;
}

export class PollingSource implements AircraftDataSource {
  private readonly fetchFn: typeof fetch;
  private refreshMs: number;
  private readonly onUnauthorized: () => void;
  private generation = 0;

  constructor(opts: PollingOptions = {}) {
    this.fetchFn = opts.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
    this.refreshMs = opts.refreshMs ?? DEFAULT_REFRESH_MS;
    this.onUnauthorized =
      opts.onUnauthorized ??
      (() => {
        if (typeof window !== 'undefined') window.location.href = '/login.html';
      });
  }

  setRefresh(ms: number): void {
    if (ms > 0) this.refreshMs = ms;
  }

  async getReceiver(): Promise<Receiver> {
    const res = await this.fetchFn(apiUrl(withCacheBust(RECEIVER_PATH)));
    if (res.status === 401) {
      this.onUnauthorized();
      throw new Error('Unauthorized');
    }
    return (await res.json()) as Receiver;
  }

  async getHistoryFrame(n: number): Promise<AircraftSnapshot> {
    const res = await this.fetchFn(apiUrl(withCacheBust(`/data/history_${n}.json`)));
    if (res.status === 401) {
      this.onUnauthorized();
      throw new Error('Unauthorized');
    }
    return (await res.json()) as AircraftSnapshot;
  }

  subscribe(handler: SnapshotHandler): () => void {
    const gen = ++this.generation;
    let stopped = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async (): Promise<void> => {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        // Live aircraft.json is not cache-busted (matches tar1090; relies on
        // server no-cache headers). receiver/history still bust the cache.
        const res = await this.fetchFn(apiUrl(AIRCRAFT_PATH));
        if (res.status === 401) {
          stopped = true;
          this.onUnauthorized();
          return;
        }
        const snap = (await res.json()) as AircraftSnapshot;
        if (!stopped && gen === this.generation) handler(snap);
      } catch {
        // swallow single-fetch error, retry next tick
      } finally {
        inFlight = false;
        if (!stopped && gen === this.generation) {
          timer = setTimeout(() => void tick(), this.refreshMs);
        }
      }
    };

    void tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
      this.generation++;
    };
  }
}
