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
    const url = (fetchFn.mock.calls[0] as unknown[])[0] as string;
    expect(url).toContain('/data/receiver.json');
    expect(url).toContain('_=');
  });

  it('subscribe requests aircraft.json without a cache-bust param', async () => {
    const snap: AircraftSnapshot = { now: 1, messages: 0, aircraft: [] };
    const fetchFn = vi.fn(async () => jsonResponse(snap));
    const src = new PollingSource({ fetchFn, refreshMs: 1000 });
    const unsub = src.subscribe(vi.fn());
    await vi.waitFor(() => expect(fetchFn).toHaveBeenCalled());
    unsub();
    const url = (fetchFn.mock.calls[0] as unknown[])[0] as string;
    expect(url).toContain('/data/aircraft.json');
    expect(url).not.toContain('_=');
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

  it('swallows a fetch error and retries on the next tick', async () => {
    const snap: AircraftSnapshot = { now: 2, messages: 20, aircraft: [] };
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(jsonResponse(snap));
    const src = new PollingSource({ fetchFn, refreshMs: 5 });
    const handler = vi.fn();
    src.subscribe(handler);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith(snap));
  });

  it('suppresses handler call if unsubscribed while fetch is in flight', async () => {
    let resolve!: (r: Response) => void;
    const fetchFn = vi.fn(
      () =>
        new Promise<Response>((res) => {
          resolve = res;
        }),
    );
    const src = new PollingSource({ fetchFn, refreshMs: 1 });
    const handler = vi.fn();
    const unsub = src.subscribe(handler);
    await new Promise((r) => setTimeout(r, 20));
    unsub();
    resolve(jsonResponse({ now: 1, messages: 0, aircraft: [] }));
    await new Promise((r) => setTimeout(r, 20));
    expect(handler).not.toHaveBeenCalled();
  });

  it('skips overlapping ticks while a fetch is still in flight', async () => {
    let resolve!: (r: Response) => void;
    const fetchFn = vi.fn(
      () =>
        new Promise<Response>((res) => {
          resolve = res;
        }),
    );
    const src = new PollingSource({ fetchFn, refreshMs: 1 });
    src.subscribe(vi.fn());
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchFn).toHaveBeenCalledTimes(1); // first fetch still pending, no second fetch
    resolve(new Response('{}', { status: 200 }));
  });
});

describe('PollingSource.getHistoryFrame', () => {
  it('fetches /data/history_N.json with cache-bust and parses the snapshot', async () => {
    const snap: AircraftSnapshot = { now: 5, messages: 1, aircraft: [] };
    const fetchFn = vi.fn(async () => jsonResponse(snap));
    const src = new PollingSource({ fetchFn });
    const frame = await src.getHistoryFrame(42);
    expect(frame.now).toBe(5);
    const url = (fetchFn.mock.calls[0] as unknown[])[0] as string;
    expect(url).toContain('/data/history_42.json');
    expect(url).toContain('_=');
  });
});
