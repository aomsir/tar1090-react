import { describe, expect, it, vi } from 'vitest';
import type { AircraftSnapshot } from '@/data/types';
import { buildAircraftPasses } from '@/features/playback/aircraftPasses';
import {
  computeHistoryStatisticsDTO,
  hydrateAircraftPasses,
  preprocessHistoryFrames,
  serializeHistoryStatisticsInput,
} from '@/features/playback/historyPreprocess';
import {
  HistoryPreprocessCancelledError,
  HistoryPreprocessClient,
  type HistoryPreprocessResponse,
} from '@/features/playback/historyPreprocessClient';
import { computeHistoryStats } from '@/features/stats/historyStats';

function frame(now: number, aircraft: AircraftSnapshot['aircraft']): AircraftSnapshot {
  return { now, messages: 0, aircraft };
}

function projectPasses(passes: ReturnType<typeof buildAircraftPasses>) {
  return passes.map((pass) => ({
    passId: pass.passId,
    hex: pass.hex,
    startTime: pass.startTime,
    endTime: pass.endTime,
    latest: {
      flight: pass.aircraft.flight,
      registration: pass.aircraft.registration,
      typeCode: pass.aircraft.typeCode,
      lat: pass.aircraft.lat,
      lon: pass.aircraft.lon,
      altitude: pass.aircraft.altitude,
      speed: pass.aircraft.speed,
      addrType: pass.aircraft.addrType,
      country: pass.aircraft.country,
      flagPath: pass.aircraft.flagPath,
    },
    trackPoints: pass.trackPoints,
    altitudeSummary: pass.altitudeSummary,
    maxAltitude: pass.maxAltitude,
    maxSpeed: pass.maxSpeed,
    maxDistance: pass.maxDistance,
    hadAltitude: pass.hadAltitude,
    hadGround: pass.hadGround,
    hadEmergency: pass.hadEmergency,
    hadSquawk: pass.hadSquawk,
  }));
}

class FakeWorker {
  onmessage: ((event: MessageEvent<HistoryPreprocessResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly postMessage = vi.fn();
  readonly terminate = vi.fn();

  respond(message: HistoryPreprocessResponse): void {
    this.onmessage?.({ data: message } as MessageEvent<HistoryPreprocessResponse>);
  }

  fail(message = 'worker failed'): void {
    this.onerror?.({ message } as ErrorEvent);
  }
}

describe('history preprocessing', () => {
  const frames = [
    frame(200, [
      { hex: ' ABC123 ', flight: 'FIRST100', lat: 30, lon: 110, altitude: 10_000, speed: 200 },
      {
        hex: 'def456',
        lat: 31,
        lon: 111,
        altitude: 'ground',
        emergency: 'general',
        squawk: '7700',
      },
    ]),
    frame(100, [{ hex: 'abc123', callsign: 'SECOND200', lat: 29, lon: 109, altitude: 9_000 }]),
    frame(201, [
      { hex: 'abc123', r: 'B-TEST', t: 'A320', lat: 30, lon: 110, altitude: 11_000, speed: 220 },
    ]),
  ];

  it('matches canonical pass output after serializing and hydrating', () => {
    const direct = buildAircraftPasses(frames, { siteLat: 30, siteLon: 110 });
    const serialized = preprocessHistoryFrames(frames, { siteLat: 30, siteLon: 110 });
    const hydrated = hydrateAircraftPasses(serialized.passes);

    expect(projectPasses(hydrated)).toEqual(projectPasses(direct));
    expect(() => structuredClone(serialized)).not.toThrow();
  });

  it('hydrates independent Aircraft and track arrays at the pass end time', () => {
    const serialized = preprocessHistoryFrames(frames);
    const [first] = hydrateAircraftPasses(serialized.passes);
    const [second] = hydrateAircraftPasses(serialized.passes);

    expect(first.aircraft).not.toBe(second.aircraft);
    expect(first.trackPoints).not.toBe(second.trackPoints);
    expect(first.aircraft.lastUpdated).toBe(first.endTime);
    first.trackPoints.push({ lon: 0, lat: 0, ts: 0, ground: false });
    expect(second.trackPoints).toHaveLength(serialized.passes[0].trackPoints.length);
  });

  it('preserves latest fields when later nullable identity values are ignored by Aircraft.update', () => {
    const hydrated = hydrateAircraftPasses(
      preprocessHistoryFrames([
        frame(100, [{ hex: 'abc123', flight: 'TEST100', r: 'B-TEST', t: 'A320' }]),
        frame(101, [{ hex: 'abc123', flight: null, r: null, t: null, type: null }]),
      ]).passes,
    );

    expect(hydrated[0].aircraft).toMatchObject({
      flight: 'TEST100',
      registration: 'B-TEST',
      typeCode: 'A320',
    });
  });

  it('treats nullable mlat like Aircraft.update and does not attempt to copy it', () => {
    const hydrated = hydrateAircraftPasses(
      preprocessHistoryFrames([
        frame(100, [{ hex: 'abc123', lat: 1, lon: 2, mlat: ['lat'] }]),
        frame(101, [
          {
            hex: 'abc123',
            lat: 2,
            lon: 3,
            mlat: null,
          } as unknown as AircraftSnapshot['aircraft'][number],
        ]),
      ]).passes,
    );

    expect(hydrated[0].aircraft).toMatchObject({ addrType: 'adsb', isMlat: false });
  });

  it('serializes enriched statistics and computes the canonical result', () => {
    const hydrated = hydrateAircraftPasses(preprocessHistoryFrames(frames).passes);
    hydrated[0].aircraft.registration = 'B-ENRICHED';
    hydrated[0].aircraft.typeCode = 'A320';
    hydrated[0].aircraft.country = 'China';
    hydrated[0].aircraft.isMilitary = true;

    const input = serializeHistoryStatisticsInput(frames, hydrated);

    expect(computeHistoryStatisticsDTO(input)).toEqual(computeHistoryStats(frames, hydrated));
    expect(() => structuredClone(input)).not.toThrow();
  });
});

describe('HistoryPreprocessClient', () => {
  it('posts a preprocess request and resolves the matching generation', async () => {
    const worker = new FakeWorker();
    const client = new HistoryPreprocessClient(() => worker as unknown as Worker);
    const promise = client.preprocess(3, [], {});

    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'preprocess',
      requestId: 1,
      generation: 3,
      frames: [],
      options: {},
    });
    worker.respond({ type: 'success', requestId: 1, generation: 3, result: { passes: [] } });
    await expect(promise).resolves.toEqual({ passes: [] });
  });

  it('rejects superseded work and ignores its late response', async () => {
    const worker = new FakeWorker();
    const client = new HistoryPreprocessClient(() => worker as unknown as Worker);
    const first = client.preprocess(1, [], {});
    const second = client.preprocess(2, [], {});

    await expect(first).rejects.toBeInstanceOf(HistoryPreprocessCancelledError);
    worker.respond({ type: 'success', requestId: 1, generation: 1, result: { passes: [] } });
    worker.respond({ type: 'success', requestId: 2, generation: 2, result: { passes: [] } });
    await expect(second).resolves.toEqual({ passes: [] });
  });

  it('uses the matching main-thread fallback after a Worker error', async () => {
    const worker = new FakeWorker();
    const fallback = vi.fn(() => ({ passes: [] }));
    const client = new HistoryPreprocessClient(() => worker as unknown as Worker, {
      preprocess: fallback,
    });
    const promise = client.preprocess(7, [], {});

    worker.fail();

    await expect(promise).resolves.toEqual({ passes: [] });
    expect(fallback).toHaveBeenCalledWith([], {});
  });

  it('uses the matching main-thread fallback after a Worker failure response', async () => {
    const worker = new FakeWorker();
    const fallback = vi.fn(() => ({ passes: [] }));
    const client = new HistoryPreprocessClient(() => worker as unknown as Worker, {
      preprocess: fallback,
    });
    const promise = client.preprocess(7, [], {});

    worker.respond({ type: 'failure', requestId: 1, generation: 7, message: 'failed' });

    await expect(promise).resolves.toEqual({ passes: [] });
    expect(fallback).toHaveBeenCalledWith([], {});
  });

  it('terminates and rejects outstanding work when disposed', async () => {
    const worker = new FakeWorker();
    const client = new HistoryPreprocessClient(() => worker as unknown as Worker);
    const promise = client.preprocess(4, [], {});

    client.dispose();

    expect(worker.terminate).toHaveBeenCalledOnce();
    await expect(promise).rejects.toBeInstanceOf(HistoryPreprocessCancelledError);
    await expect(client.preprocess(5, [], {})).rejects.toBeInstanceOf(
      HistoryPreprocessCancelledError,
    );
  });

  it('keeps same-generation preprocess and statistics requests separate', async () => {
    const worker = new FakeWorker();
    const client = new HistoryPreprocessClient(() => worker as unknown as Worker);
    const preprocess = client.preprocess(3, [], {});
    const statistics = client.statistics(3, { frames: [], passes: [] });

    worker.respond({
      type: 'statistics-success',
      requestId: 2,
      generation: 3,
      result: computeHistoryStatisticsDTO({ frames: [], passes: [] }),
    });
    worker.respond({ type: 'success', requestId: 1, generation: 3, result: { passes: [] } });

    await expect(preprocess).resolves.toEqual({ passes: [] });
    await expect(statistics).resolves.toEqual(
      computeHistoryStatisticsDTO({ frames: [], passes: [] }),
    );
  });

  it('keeps same-generation requests of the same type separate', async () => {
    const worker = new FakeWorker();
    const client = new HistoryPreprocessClient(() => worker as unknown as Worker);
    const first = client.preprocess(3, [], {});
    const second = client.preprocess(3, [], {});

    worker.respond({ type: 'success', requestId: 2, generation: 3, result: { passes: [] } });
    worker.respond({ type: 'success', requestId: 1, generation: 3, result: { passes: [] } });

    await expect(first).resolves.toEqual({ passes: [] });
    await expect(second).resolves.toEqual({ passes: [] });
  });

  it('rejects a response with the wrong type without resolving the request', async () => {
    const worker = new FakeWorker();
    const client = new HistoryPreprocessClient(() => worker as unknown as Worker);
    const request = client.preprocess(3, [], {});

    worker.respond({
      type: 'statistics-success',
      requestId: 1,
      generation: 3,
      result: computeHistoryStatisticsDTO({ frames: [], passes: [] }),
    });

    await expect(request).rejects.toThrow('response type');
  });

  it('recreates the Worker after an error and falls back every pending request', async () => {
    const first = new FakeWorker();
    const second = new FakeWorker();
    const createWorker = vi
      .fn()
      .mockReturnValueOnce(first as unknown as Worker)
      .mockReturnValueOnce(second as unknown as Worker);
    const preprocessFallback = vi.fn(() => ({ passes: [] }));
    const statisticsFallback = vi.fn(() => computeHistoryStatisticsDTO({ frames: [], passes: [] }));
    const client = new HistoryPreprocessClient(createWorker, {
      preprocess: preprocessFallback,
      statistics: statisticsFallback,
    });
    const preprocess = client.preprocess(3, [], {});
    const statistics = client.statistics(3, { frames: [], passes: [] });

    first.fail();

    await expect(preprocess).resolves.toEqual({ passes: [] });
    await expect(statistics).resolves.toEqual(
      computeHistoryStatisticsDTO({ frames: [], passes: [] }),
    );
    expect(first.terminate).toHaveBeenCalledOnce();
    const next = client.preprocess(3, [], {});
    expect(createWorker).toHaveBeenCalledTimes(2);
    second.respond({ type: 'success', requestId: 3, generation: 3, result: { passes: [] } });
    await expect(next).resolves.toEqual({ passes: [] });
  });

  it('snapshots no-Worker fallback input before callers can mutate it', async () => {
    let observedHex: string | undefined;
    const fallback = vi.fn((frames: AircraftSnapshot[], options) => {
      observedHex = frames[0].aircraft[0].hex;
      return preprocessHistoryFrames(frames, options);
    });
    const client = new HistoryPreprocessClient(() => null, { preprocess: fallback });
    const input = [frame(1, [{ hex: 'abc123', lat: 1, lon: 2 }])];
    const onFallback = vi.fn();
    (input[0] as unknown as { nonCloneable: () => void }).nonCloneable = () => {};
    const request = client.preprocess(1, input, {}, onFallback);
    input[0].aircraft[0].hex = 'changed';

    expect(fallback).toHaveBeenCalledOnce();
    expect(onFallback).toHaveBeenCalledOnce();
    expect(observedHex).toBe('abc123');
    await expect(request).resolves.toMatchObject({ passes: [{ hex: 'abc123' }] });
  });

  it('returns a rejected Promise rather than throwing when no-Worker fallback fails', async () => {
    const fallback = vi.fn(() => {
      throw new Error('fallback failed');
    });
    const onFallback = vi.fn();
    const client = new HistoryPreprocessClient(() => null, { preprocess: fallback });

    const request = client.preprocess(1, [], {}, onFallback);

    expect(onFallback).toHaveBeenCalledOnce();
    await expect(request).rejects.toThrow('fallback failed');
  });

  it('uses stable no-Worker fallbacks when Worker creation throws synchronously', async () => {
    const createWorker = vi.fn(() => {
      throw new Error('blocked by CSP');
    });
    const preprocessFallback = vi.fn(() => ({ passes: [] }));
    const statisticsResult = computeHistoryStatisticsDTO({ frames: [], passes: [] });
    const statisticsFallback = vi.fn(() => statisticsResult);
    const preprocessFallbackPhase = vi.fn();
    const statisticsFallbackPhase = vi.fn();
    const client = new HistoryPreprocessClient(createWorker, {
      preprocess: preprocessFallback,
      statistics: statisticsFallback,
    });

    await expect(client.preprocess(1, [], {}, preprocessFallbackPhase)).resolves.toEqual({
      passes: [],
    });
    await expect(
      client.statistics(1, { frames: [], passes: [] }, statisticsFallbackPhase),
    ).resolves.toEqual(statisticsResult);

    expect(createWorker).toHaveBeenCalledOnce();
    expect(preprocessFallback).toHaveBeenCalledOnce();
    expect(statisticsFallback).toHaveBeenCalledOnce();
    expect(preprocessFallbackPhase).toHaveBeenCalledOnce();
    expect(statisticsFallbackPhase).toHaveBeenCalledOnce();
  });

  it('falls back after postMessage throws synchronously', async () => {
    const worker = new FakeWorker();
    worker.postMessage.mockImplementationOnce(() => {
      throw new Error('post failed');
    });
    const fallback = vi.fn(() => ({ passes: [] }));
    const client = new HistoryPreprocessClient(() => worker as unknown as Worker, {
      preprocess: fallback,
    });

    await expect(client.preprocess(1, [], {})).resolves.toEqual({ passes: [] });
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(fallback).toHaveBeenCalledWith([], {});
  });
});
