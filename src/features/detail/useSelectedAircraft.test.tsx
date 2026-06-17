import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { Aircraft } from '@/domain/Aircraft';
import { useSelectedAircraft } from './useSelectedAircraft';

describe('useSelectedAircraft', () => {
  beforeEach(() => {
    aircraftStore.reset();
    useLiveTick.setState({ version: 0 });
    useSelectionStore.setState({ selectedHex: null });
  });

  it('returns null when nothing is selected', () => {
    const { result } = renderHook(() => useSelectedAircraft());
    expect(result.current).toBeNull();
  });

  it('returns the selected aircraft detail and updates with selection', () => {
    const a = new Aircraft('780ABC');
    a.flight = 'CCA101';
    aircraftStore.map.set('780ABC', a);

    const { result } = renderHook(() => useSelectedAircraft());
    act(() => useSelectionStore.getState().select('780ABC'));
    expect(result.current?.flight).toBe('CCA101');
  });
});
