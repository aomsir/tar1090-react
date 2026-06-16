import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef } from 'react';
import { useLiveData } from './useLiveData';
import type { AircraftDataSource, SnapshotHandler } from '@/data/source';
import type { MapController } from '@/map/MapController';
import { useStatsStore } from '@/store/statsStore';
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
    aircraftStore.map.clear();
    useStatsStore.setState({ count: 0, messages: 0, messageRate: 0, now: 0 });
  });

  it('feeds snapshots into the store, stats and the map controller', async () => {
    const source = makeSource();
    const controller = { syncAircraft: vi.fn(), setSelected: vi.fn(), onSelect: vi.fn(), dispose: vi.fn() } as unknown as MapController;

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
      source.emit({ now: 1, messages: 50, aircraft: [{ hex: 'a', lat: 1, lon: 2, altitude: 1000 }] });
    });

    expect(aircraftStore.map.has('a')).toBe(true);
    expect(useStatsStore.getState().count).toBe(1);
    expect(controller.syncAircraft).toHaveBeenCalled();
  });
});
