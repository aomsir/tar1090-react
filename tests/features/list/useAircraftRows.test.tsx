import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useListControls } from '@/store/listControls';
import { useMapViewStore } from '@/store/mapViewStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { historyStore } from '@/store/historyStore';
import { Aircraft } from '@/domain/Aircraft';
import { useAircraftRows } from '@/features/list/useAircraftRows';

function seed(hex: string, fields: Partial<Aircraft>): void {
  const a = new Aircraft(hex);
  Object.assign(a, fields);
  aircraftStore.map.set(hex, a);
}

describe('useAircraftRows', () => {
  beforeEach(() => {
    aircraftStore.reset();
    historyStore.reset();
    usePlaybackStore.getState().reset();
    useLiveTick.setState({ version: 0 });
    useListControls.setState({
      query: '',
      filter: 'all',
      sortKey: 'altitude',
      sortDir: 'desc',
    });
    useToolbarStore.setState({ inViewOnly: false });
    useMapViewStore.setState({ extent: null });
  });

  it('returns sorted rows reflecting the store after a tick bump', () => {
    seed('A1', { flight: 'CCA1', altitude: 30000 });
    seed('A2', { flight: 'CCA2', altitude: 10000 });
    act(() => useLiveTick.getState().bump());

    const { result } = renderHook(() => useAircraftRows());
    expect(result.current.map((r) => r.hex)).toEqual(['A1', 'A2']);
  });

  it('reacts to filter changes', () => {
    seed('A1', { altitude: 30000 });
    seed('A2', { altitude: 'ground' });
    act(() => useLiveTick.getState().bump());

    const { result } = renderHook(() => useAircraftRows());
    act(() => useListControls.getState().setFilter('ground'));
    expect(result.current.map((r) => r.hex)).toEqual(['A2']);
  });

  it('projects history passes instead of collapsing repeated hex aircraft', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 1,
        aircraft: [{ hex: 'H1', flight: 'HIST1', lat: 30, lon: 110, speed: 100 }],
      },
      {
        now: 110,
        messages: 2,
        aircraft: [{ hex: 'H1', flight: 'HIST1', lat: 31, lon: 111, speed: 300 }],
      },
    ]);
    await historyStore.buildPassData(30, 110);
    act(() => usePlaybackStore.getState().setMode('history'));

    const { result } = renderHook(() => useAircraftRows());
    expect(result.current.map((r) => r.rowId)).toEqual(['h1:100']);
    expect(result.current[0].speed).toBe(300);
    expect(result.current[0].distance).toBeGreaterThan(0);
  });
});
