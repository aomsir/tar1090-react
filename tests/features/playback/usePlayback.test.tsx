import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';
import { usePlayback } from '@/features/playback/usePlayback';
import { usePlaybackStore } from '@/store/playbackStore';
import { historyStore } from '@/store/historyStore';
import type { MapController } from '@/map/MapController';
import type { AircraftSnapshot } from '@/data/types';

vi.mock('@/domain/enrich', () => ({
  enrichAircraft: vi.fn(async () => {}),
}));

function Harness({ controller }: { controller: MapController }) {
  const ref = useRef<MapController | null>(controller);
  usePlayback(ref);
  return null;
}

describe('usePlayback', () => {
  beforeEach(() => {
    historyStore.reset();
    usePlaybackStore.getState().reset();
  });

  it('shows pass-keyed tracks after asynchronous history data construction', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: 'abc', lat: 0, lon: 0, altitude: 1000 },
          { hex: 'abc', lat: 1, lon: 1, altitude: 2000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    const controller = {
      syncAircraft: vi.fn(),
      showPTracks: vi.fn(),
      clearPTracks: vi.fn(),
      clearTrack: vi.fn(),
    } as unknown as MapController;

    render(<Harness controller={controller} />);
    await act(async () => {
      usePlaybackStore.getState().setBounds({ min: 100, max: 100 });
      usePlaybackStore.getState().setMode('history');
      await historyStore.buildPassData();
    });

    expect(controller.showPTracks).toHaveBeenCalledWith(
      historyStore.passTracksData,
      expect.any(Number),
    );
  });

  it('clears pTracks outside history mode', () => {
    const controller = {
      syncAircraft: vi.fn(),
      showPTracks: vi.fn(),
      clearPTracks: vi.fn(),
      clearTrack: vi.fn(),
    } as unknown as MapController;

    render(<Harness controller={controller} />);

    expect(controller.clearPTracks).toHaveBeenCalled();
  });

  it('auto-pauses at the upper bound during playback', () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    const controller = {
      syncAircraft: vi.fn(),
      showPTracks: vi.fn(),
      clearPTracks: vi.fn(),
      clearTrack: vi.fn(),
    } as unknown as MapController;
    usePlaybackStore.getState().setBounds({ min: 100, max: 100 });
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setCursor(100);
    let cb: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      cb = fn;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().play());
    act(() => cb?.(1_000_000));
    expect(usePlaybackStore.getState().isPlaying).toBe(false);
    expect(usePlaybackStore.getState().cursorTime).toBe(100);
  });

  it('cancels the rAF loop on unmount', () => {
    historyStore.setFrames([
      { now: 100, messages: 0, aircraft: [] as unknown as AircraftSnapshot['aircraft'] },
    ]);
    const controller = {
      syncAircraft: vi.fn(),
      showPTracks: vi.fn(),
      clearPTracks: vi.fn(),
      clearTrack: vi.fn(),
    } as unknown as MapController;
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setCursor(100);
    const cancelSpy = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', cancelSpy);
    const { unmount } = render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().play());
    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(1);
  });
});
