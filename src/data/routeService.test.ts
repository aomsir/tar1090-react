import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouteService } from './routeService';

/** Mock a successful adsbdb response for a single callsign */
function adsbdbOk(origin: string, destination: string) {
  const body = JSON.stringify({
    response: {
      flightroute: {
        origin: { iata_code: origin },
        destination: { iata_code: destination },
      },
    },
  });
  return { ok: true, text: () => Promise.resolve(body) };
}

/** Mock a 400 "invalid callsign" response */
function adsbdb400() {
  return { ok: false, status: 400 };
}

describe('RouteService (adsbdb)', () => {
  let svc: RouteService;

  beforeEach(() => {
    svc = new RouteService();
  });

  it('enqueue skips callsigns already in cache', () => {
    svc.enqueue('CCA1234');
    svc.enqueue('CCA1234');
    expect(svc.queueSize).toBe(1);
  });

  it('enqueue skips empty callsign', () => {
    svc.enqueue('');
    expect(svc.queueSize).toBe(0);
  });

  it('lookup returns undefined for unknown callsign', () => {
    expect(svc.lookup('UNKNOWN')).toBeUndefined();
  });

  it('fetches and caches route from adsbdb', async () => {
    const fetchFn = vi.fn().mockResolvedValue(adsbdbOk('PEK', 'SHA'));
    svc.enqueue('CCA1533');
    await svc.flush('https://api.adsbdb.com/v0/callsign', fetchFn);
    expect(svc.lookup('CCA1533')).toBe('PEK - SHA');
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn.mock.calls[0][0]).toBe('https://api.adsbdb.com/v0/callsign/CCA1533');
  });

  it('keeps placeholder for unknown callsign (400)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(adsbdb400());
    svc.enqueue('UNKNOWN1');
    await svc.flush('https://api.adsbdb.com/v0/callsign', fetchFn);
    // Keeps empty placeholder — won't retry
    expect(svc.lookup('UNKNOWN1')).toBe('');
  });

  it('handles "invalid callsign" string response', async () => {
    const body = JSON.stringify({ response: 'invalid callsign: XYZ' });
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(body),
    });
    svc.enqueue('XYZ');
    await svc.flush('https://api.adsbdb.com/v0/callsign', fetchFn);
    expect(svc.lookup('XYZ')).toBe('');
  });

  it('does not send request when queue is empty', async () => {
    const fetchFn = vi.fn();
    await svc.flush('https://api.adsbdb.com/v0/callsign', fetchFn);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('prevents concurrent flush calls', async () => {
    const fetchFn = vi.fn().mockResolvedValue(adsbdbOk('PEK', 'SHA'));
    svc.enqueue('A');
    const p1 = svc.flush('https://api.test', fetchFn);
    svc.enqueue('B');
    const p2 = svc.flush('https://api.test', fetchFn);
    await Promise.all([p1, p2]);
    // Only one flush should run (first sees A, second is blocked)
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('clears cache and queue', () => {
    svc.enqueue('CCA1234');
    svc.clear();
    expect(svc.queueSize).toBe(0);
    expect(svc.lookup('CCA1234')).toBeUndefined();
  });

  it('retries on fetch failure (clears placeholder)', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network error'));
    svc.enqueue('FAIL1');
    await svc.flush('https://api.test', fetchFn);
    // Placeholder cleared — can be re-enqueued
    expect(svc.lookup('FAIL1')).toBeUndefined();
  });

  it('handles empty response body', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(''),
    });
    svc.enqueue('EMPTY1');
    await svc.flush('https://api.test', fetchFn);
    expect(svc.lookup('EMPTY1')).toBe('');
  });

  it('respects concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const fetchFn = vi.fn().mockImplementation(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 10));
      concurrent--;
      return adsbdbOk('A', 'B');
    });
    // Enqueue 8 items to exceed CONCURRENCY (5)
    for (let i = 0; i < 8; i++) svc.enqueue(`CS${i}`);
    await svc.flush('https://api.test', fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(8);
    expect(maxConcurrent).toBeLessThanOrEqual(5);
  });
});
