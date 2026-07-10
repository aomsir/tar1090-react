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

  it('returns the exact selected history pass detail in history mode', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [{ hex: 'aabbcc', flight: 'FIRST', altitude: 1000, speed: 100 }],
      },
      {
        now: 44000,
        messages: 0,
        aircraft: [{ hex: 'aabbcc', flight: 'SECOND', altitude: 2000, speed: 200 }],
      },
      {
        now: 44030,
        messages: 0,
        aircraft: [{ hex: 'aabbcc', flight: 'SECOND', altitude: 39000, speed: 490 }],
      },
    ] as never);
    await historyStore.buildPassData();

    act(() => usePlaybackStore.getState().setMode('history'));
    act(() => useSelectionStore.getState().selectPass('aabbcc:44000', 'aabbcc'));

    const { result } = renderHook(() => useSelectedAircraft());
    expect(result.current?.hex).toBe('aabbcc');
    expect(result.current).toMatchObject({
      passId: 'aabbcc:44000',
      flight: 'SECOND',
      altitude: 39000,
      speed: 490,
      passStartTime: 44000,
      passEndTime: 44030,
    });
  });

  it('returns null in history mode when hex is missing from history but present in live store', () => {
    const liveAc = new Aircraft('DEAD01');
    liveAc.flight = 'STALE';
    aircraftStore.map.set('DEAD01', liveAc);

    act(() => usePlaybackStore.getState().setMode('history'));
    act(() => useSelectionStore.getState().selectPass('DEAD01:100', 'DEAD01'));

    const { result } = renderHook(() => useSelectedAircraft());
    expect(result.current).toBeNull();
  });

  it('does not fall back to a matching hex when the selected pass is missing', async () => {
    historyStore.setFrames([
      { now: 100, messages: 0, aircraft: [{ hex: 'aabbcc', flight: 'FIRST', altitude: 1000 }] },
    ] as never);
    await historyStore.buildPassData();
    act(() => usePlaybackStore.getState().setMode('history'));
    act(() => useSelectionStore.getState().selectPass('aabbcc:missing', 'aabbcc'));

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
