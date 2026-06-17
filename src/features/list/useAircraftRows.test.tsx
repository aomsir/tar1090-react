import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useListControls } from '@/store/listControls';
import { useMapViewStore } from '@/store/mapViewStore';
import { Aircraft } from '@/domain/Aircraft';
import { useAircraftRows } from './useAircraftRows';

function seed(hex: string, fields: Partial<Aircraft>): void {
  const a = new Aircraft(hex);
  Object.assign(a, fields);
  aircraftStore.map.set(hex, a);
}

describe('useAircraftRows', () => {
  beforeEach(() => {
    aircraftStore.reset();
    useLiveTick.setState({ version: 0 });
    useListControls.setState({
      query: '',
      filter: 'all',
      sortKey: 'altitude',
      sortDir: 'desc',
      inViewOnly: false,
    });
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
});
