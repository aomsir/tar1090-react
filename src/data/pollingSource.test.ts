import { describe, it, expect, vi } from 'vitest';
import { PollingSource } from './pollingSource';
import type { AircraftSnapshot, Receiver } from './types';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('PollingSource', () => {
  it('getReceiver fetches receiver.json with a cache-bust param', async () => {
    const receiver: Receiver = { version: '1.0.0', refresh: 1000, history: 78 };
    const fetchFn = vi.fn(async () => jsonResponse(receiver));
    const src = new PollingSource({ fetchFn });
    await expect(src.getReceiver()).resolves.toEqual(receiver);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/data/receiver.json');
    expect(url).toContain('_=');
  });

  it('subscribe polls aircraft.json repeatedly and delivers snapshots', async () => {
    const snap: AircraftSnapshot = { now: 1, messages: 10, aircraft: [] };
    const fetchFn = vi.fn(async () => jsonResponse(snap));
    const src = new PollingSource({ fetchFn, refreshMs: 5 });
    const handler = vi.fn();
    const unsub = src.subscribe(handler);
    await vi.waitFor(() => expect(handler.mock.calls.length).toBeGreaterThanOrEqual(2));
    unsub();
    const afterStop = handler.mock.calls.length;
    await new Promise((r) => setTimeout(r, 20));
    expect(handler.mock.calls.length).toBe(afterStop);
    expect(handler).toHaveBeenCalledWith(snap);
  });

  it('skips overlapping ticks while a fetch is still in flight', async () => {
    let resolve!: (r: Response) => void;
    const fetchFn = vi.fn(
      () => new Promise<Response>((res) => { resolve = res; }),
    );
    const src = new PollingSource({ fetchFn, refreshMs: 1 });
    src.subscribe(vi.fn());
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchFn).toHaveBeenCalledTimes(1); // first fetch still pending, no second fetch
    resolve(new Response('{}', { status: 200 }));
  });
});
