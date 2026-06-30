/** Max concurrent requests per flush cycle */
const CONCURRENCY = 5;

interface AdsbdbResponse {
  response:
    | {
        flightroute: {
          origin: { iata_code: string };
          destination: { iata_code: string };
        };
      }
    | string; // "invalid callsign: ..." or "unknown callsign"
}

export class RouteService {
  private cache = new Map<string, string>();
  private queue: string[] = [];
  private inFlight = false;

  get queueSize(): number {
    return this.queue.length;
  }

  enqueue(callsign: string): void {
    if (!callsign || this.cache.has(callsign)) return;
    this.cache.set(callsign, ''); // placeholder to prevent re-enqueue
    this.queue.push(callsign);
  }

  async flush(apiBase: string, fetchFn: typeof fetch = fetch): Promise<void> {
    if (this.inFlight || this.queue.length === 0) return;
    this.inFlight = true;
    const batch = this.queue.splice(0, 100);

    // Process in chunks of CONCURRENCY
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      const chunk = batch.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map((cs) => this.fetchOne(apiBase, cs, fetchFn)),
      );
      for (const r of results) {
        if (r.status === 'rejected') {
          console.warn('Route lookup failed:', r.reason);
        }
      }
    }

    this.inFlight = false;
  }

  private async fetchOne(apiBase: string, callsign: string, fetchFn: typeof fetch): Promise<void> {
    try {
      const url = `${apiBase.replace(/\/$/, '')}/${encodeURIComponent(callsign)}`;
      const res = await fetchFn(url);
      if (!res.ok) return; // 400 = unknown callsign, keep placeholder
      const text = await res.text();
      if (!text) return;
      const data: AdsbdbResponse = JSON.parse(text);
      if (typeof data.response === 'string') return; // "invalid callsign"
      const { origin, destination } = data.response.flightroute;
      if (origin.iata_code && destination.iata_code) {
        this.cache.set(callsign, `${origin.iata_code} - ${destination.iata_code}`);
      }
    } catch {
      this.cache.delete(callsign); // allow retry on next cycle
    }
  }

  lookup(callsign: string): string | undefined {
    return this.cache.get(callsign);
  }

  clear(): void {
    this.cache.clear();
    this.queue = [];
    this.inFlight = false;
  }
}

export const routeService = new RouteService();
