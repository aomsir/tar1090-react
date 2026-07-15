import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef } from 'react';
import { useLiveData } from '@/features/live/useLiveData';
import type { AircraftDataSource, SnapshotHandler } from '@/data/source';
import type { MapController } from '@/map/MapController';
import type { AircraftEnricher } from '@/features/live/AircraftEnricher';
import { useStatsStore } from '@/store/statsStore';
import { usePlaybackStore } from '@/store/playbackStore';

const { enrichAircraftMock } = vi.hoisted(() => ({ enrichAircraftMock: vi.fn() }));
enrichAircraftMock.mockResolvedValue(undefined);
vi.mock('@/domain/enrich', () => ({ enrichAircraft: enrichAircraftMock }));
import { useLiveTick } from '@/store/liveTick';
import { aircraftStore } from '@/store/aircraftStore';

function makeSource() {
  let handler: SnapshotHandler | null = null;
  const source: AircraftDataSource & { setRefresh: (ms: number) => void; emit: SnapshotHandler } = {
    getReceiver: vi.fn().mockResolvedValue({ version: '1', refresh: 1000, history: 0 }),
    subscribe: vi.fn((h: SnapshotHandler) => {
      handler = h;
      return () => {};
    }),
    setRefresh: vi.fn(),
    emit: (snap) => handler?.(snap),
  };
  return source;
}

describe('useLiveData', () => {
  beforeEach(() => {
    aircraftStore.reset();
    useStatsStore.setState({ count: 0, messages: 0, messageRate: 0, now: 0 });
    useLiveTick.setState({ version: 0 });
    usePlaybackStore.getState().reset();
    enrichAircraftMock.mockReset();
    enrichAircraftMock.mockResolvedValue(undefined);
  });

  it('feeds snapshots into the store, stats and the map controller', async () => {
    const source = makeSource();
    const controller = {
      syncAircraft: vi.fn(),
      setSelected: vi.fn(),
      onSelect: vi.fn(),
      dispose: vi.fn(),
    } as unknown as MapController;

    function Harness() {
      const ref = useRef<MapController | null>(controller);
      useLiveData(ref, source);
      return null;
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(source.subscribe).toHaveBeenCalled());
    act(() => {
      source.emit({
        now: 1,
        messages: 50,
        aircraft: [{ hex: 'a', lat: 1, lon: 2, altitude: 1000 }],
      });
    });

    expect(aircraftStore.map.has('a')).toBe(true);
    expect(useStatsStore.getState().count).toBe(1);
    expect(controller.syncAircraft).toHaveBeenCalled();
    expect(useLiveTick.getState().version).toBe(1);
  });

  it('enriches aircraft from each snapshot', async () => {
    const source = makeSource();
    const controller = {
      syncAircraft: vi.fn(),
      setSelected: vi.fn(),
      onSelect: vi.fn(),
      dispose: vi.fn(),
    } as unknown as MapController;

    const enrichPending = vi.fn();
    const enricher = { enrichPending } as unknown as AircraftEnricher;

    function Harness() {
      const ref = useRef<MapController | null>(controller);
      useLiveData(ref, source, enricher);
      return null;
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(source.subscribe).toHaveBeenCalled());
    act(() => {
      source.emit({
        now: 1,
        messages: 10,
        aircraft: [{ hex: 'a00001', lat: 1, lon: 2, altitude: 1000 }],
      });
    });

    await waitFor(() => expect(enrichPending).toHaveBeenCalled());
  });

  it('bumps liveTick again after enrichment settles so list/detail see enriched fields', async () => {
    const source = makeSource();
    const controller = {
      syncAircraft: vi.fn(),
      setSelected: vi.fn(),
      onSelect: vi.fn(),
      dispose: vi.fn(),
    } as unknown as MapController;

    // Don't pass an enricherOverride: let useLiveData wire its own enricher,
    // which uses the (mocked) enrichAircraft and an onEnriched that bumps liveTick.
    enrichAircraftMock.mockImplementation(async (ac) => {
      ac.registration = 'N12345';
    });

    function Harness() {
      const ref = useRef<MapController | null>(controller);
      useLiveData(ref, source);
      return null;
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(source.subscribe).toHaveBeenCalled());

    act(() => {
      source.emit({
        now: 1,
        messages: 10,
        aircraft: [{ hex: 'a00001', lat: 1, lon: 2, altitude: 1000 }],
      });
    });

    // After the snapshot, version is 1.
    await waitFor(() => expect(useLiveTick.getState().version).toBe(1));

    // After enrichment settles, version must bump again so list/detail refresh.
    await waitFor(() => expect(useLiveTick.getState().version).toBe(2));
    expect(aircraftStore.map.get('a00001')?.registration).toBe('N12345');
  });

  it('does not let delayed enrichment overwrite history markers', async () => {
    const source = makeSource();
    const controller = {
      syncAircraft: vi.fn(),
      setSelected: vi.fn(),
      onSelect: vi.fn(),
      dispose: vi.fn(),
    } as unknown as MapController;
    let completeEnrichment: (() => void) | undefined;
    enrichAircraftMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completeEnrichment = resolve;
        }),
    );

    function Harness() {
      const ref = useRef<MapController | null>(controller);
      useLiveData(ref, source);
      return null;
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(source.subscribe).toHaveBeenCalled());
    act(() => source.emit({ now: 1, messages: 10, aircraft: [{ hex: 'a', lat: 1, lon: 2 }] }));
    await waitFor(() => expect(completeEnrichment).toBeTypeOf('function'));
    controller.syncAircraft.mockClear();

    act(() => usePlaybackStore.getState().setMode('history'));
    await act(async () => {
      completeEnrichment?.();
      await Promise.resolve();
    });

    expect(controller.syncAircraft).not.toHaveBeenCalled();
  });

  it('unsubscribes from the source while in history mode and resubscribes on return to live', async () => {
    const unsub = vi.fn();
    const source = {
      getReceiver: vi.fn(async () => ({ version: '1', refresh: 1000, history: 0 })),
      subscribe: vi.fn(() => unsub),
    } as unknown as AircraftDataSource;

    function Harness() {
      const ref = useRef<MapController | null>(null);
      useLiveData(ref, source);
      return null;
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(source.subscribe).toHaveBeenCalledTimes(1));
    act(() => usePlaybackStore.getState().setMode('history'));
    expect(unsub).toHaveBeenCalledTimes(1);
    act(() => usePlaybackStore.getState().setMode('live'));
    await waitFor(() => expect(source.subscribe).toHaveBeenCalledTimes(2));
  });

  it('does not let a queued source snapshot overwrite history markers', async () => {
    const source = makeSource();
    const controller = {
      syncAircraft: vi.fn(),
      setSelected: vi.fn(),
      onSelect: vi.fn(),
      dispose: vi.fn(),
    } as unknown as MapController;

    function Harness() {
      const ref = useRef<MapController | null>(controller);
      useLiveData(ref, source);
      return null;
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(source.subscribe).toHaveBeenCalled());

    act(() => usePlaybackStore.getState().setMode('history'));
    controller.syncAircraft.mockClear();
    act(() => {
      source.emit({ now: 2, messages: 10, aircraft: [{ hex: 'queued', lat: 1, lon: 2 }] });
    });

    expect(controller.syncAircraft).not.toHaveBeenCalled();
  });
});
