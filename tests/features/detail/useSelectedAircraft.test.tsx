import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { aircraftStore } from '@/store/aircraftStore';
import { historyStore } from '@/store/historyStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { Aircraft } from '@/domain/Aircraft';
import { useSelectedAircraft } from '@/features/detail/useSelectedAircraft';

describe('useSelectedAircraft', () => {
  beforeEach(() => {
    aircraftStore.reset();
    historyStore.reset();
    useLiveTick.setState({ version: 0 });
    useSelectionStore.setState({ selectedHex: null });
    usePlaybackStore.setState({ mode: 'live' });
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

  it('returns detail from history store in history mode', () => {
    const ac = new Aircraft('AABBCC');
    ac.flight = 'HIST01';
    historyStore.allAircraft = [ac];
    aircraftStore.map.clear();

    act(() => usePlaybackStore.getState().setMode('history'));
    act(() => useSelectionStore.getState().select('AABBCC'));

    const { result } = renderHook(() => useSelectedAircraft());
    expect(result.current?.hex).toBe('AABBCC');
    expect(result.current?.flight).toBe('HIST01');
  });

  it('returns null in history mode when hex is missing from history but present in live store', () => {
    const liveAc = new Aircraft('DEAD01');
    liveAc.flight = 'STALE';
    aircraftStore.map.set('DEAD01', liveAc);

    act(() => usePlaybackStore.getState().setMode('history'));
    act(() => useSelectionStore.getState().select('DEAD01'));

    const { result } = renderHook(() => useSelectedAircraft());
    expect(result.current).toBeNull();
  });

  it('still reads live aircraft store in live mode', () => {
    const liveAc = new Aircraft('112233');
    liveAc.flight = 'LIVE01';
    aircraftStore.map.set('112233', liveAc);

    act(() => useSelectionStore.getState().select('112233'));

    const { result } = renderHook(() => useSelectedAircraft());
    expect(result.current?.hex).toBe('112233');
    expect(result.current?.flight).toBe('LIVE01');
  });
});
