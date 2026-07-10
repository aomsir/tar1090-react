import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';
import { usePlayback } from '@/features/playback/usePlayback';
import { Aircraft } from '@/domain/Aircraft';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import { buildDrawablePassIndex } from '@/features/playback/historyTracks';
import { usePlaybackStore } from '@/store/playbackStore';
import { historyStore } from '@/store/historyStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
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

function indexedPass(passId: string, endTime: number): AircraftPass {
  const hex = passId.split(':')[0]!;
  return {
    passId,
    hex,
    startTime: endTime - 10,
    endTime,
    aircraft: new Aircraft(hex),
    trackPoints: [
      { lon: 0, lat: 0, ts: endTime - 1 },
      { lon: 1, lat: 1, ts: endTime },
    ],
    hadAltitude: false,
    hadGround: false,
    hadEmergency: false,
    hadSquawk: false,
  };
}

function seedIndexedPasses(count: number): void {
  historyStore.drawablePassesRecentFirst = buildDrawablePassIndex(
    Array.from({ length: count }, (_, i) => indexedPass(`hex${i}:${i}`, i)),
  );
}

function makeController(): MapController {
  return {
    syncAircraft: vi.fn(),
    showPTracks: vi.fn(),
    clearPTracks: vi.fn(),
    clearTrack: vi.fn(),
  } as unknown as MapController;
}

describe('usePlayback', () => {
  beforeEach(() => {
    historyStore.reset();
    usePlaybackStore.getState().reset();
    useToolbarStore.setState({ historyTrackLimit: 1000 });
    useSelectionStore.setState({ selectedHex: null, selectedPassId: null });
  });

  it('shows only the configured recent history tracks', () => {
    seedIndexedPasses(101);
    useToolbarStore.setState({ historyTrackLimit: 100 });
    const controller = makeController();
    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    const tracks = vi.mocked(controller.showPTracks).mock.calls.at(-1)![0];
    expect(tracks.size).toBe(100);
    expect(tracks.has('hex100:100')).toBe(true);
    expect(tracks.has('hex0:0')).toBe(false);
  });

  it('resynchronizes immediately when the limit changes', () => {
    seedIndexedPasses(101);
    useToolbarStore.setState({ historyTrackLimit: 100 });
    const controller = makeController();
    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    act(() => useToolbarStore.getState().setHistoryTrackLimit('all'));
    const tracks = vi.mocked(controller.showPTracks).mock.calls.at(-1)![0];
    expect(tracks.size).toBe(historyStore.drawablePassesRecentFirst.length);
  });

  it('adds an older selected pass outside the numeric limit', () => {
    seedIndexedPasses(101);
    useToolbarStore.setState({ historyTrackLimit: 100 });
    const oldest = historyStore.drawablePassesRecentFirst.at(-1)!;
    const controller = makeController();
    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    act(() =>
      useSelectionStore.setState({ selectedPassId: oldest.passId, selectedHex: oldest.hex }),
    );
    const tracks = vi.mocked(controller.showPTracks).mock.calls.at(-1)![0];
    expect(tracks.size).toBe(101);
    expect(tracks.has(oldest.passId)).toBe(true);
  });

  it('removes the extra older pass when selection is cleared', () => {
    seedIndexedPasses(101);
    useToolbarStore.setState({ historyTrackLimit: 100 });
    const oldest = historyStore.drawablePassesRecentFirst.at(-1)!;
    useSelectionStore.setState({ selectedPassId: oldest.passId, selectedHex: oldest.hex });
    const controller = makeController();
    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    act(() => useSelectionStore.setState({ selectedPassId: null, selectedHex: null }));
    const tracks = vi.mocked(controller.showPTracks).mock.calls.at(-1)![0];
    expect(tracks.size).toBe(100);
    expect(tracks.has(oldest.passId)).toBe(false);
  });

  it('removes the extra older pass when selection moves inside the limit', () => {
    seedIndexedPasses(101);
    useToolbarStore.setState({ historyTrackLimit: 100 });
    const oldest = historyStore.drawablePassesRecentFirst.at(-1)!;
    const newest = historyStore.drawablePassesRecentFirst[0]!;
    useSelectionStore.setState({ selectedPassId: oldest.passId, selectedHex: oldest.hex });
    const controller = makeController();
    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    act(() =>
      useSelectionStore.setState({ selectedPassId: newest.passId, selectedHex: newest.hex }),
    );
    const tracks = vi.mocked(controller.showPTracks).mock.calls.at(-1)![0];
    expect(tracks.size).toBe(100);
    expect(tracks.has(oldest.passId)).toBe(false);
  });

  it('shows every indexed pass when the limit is all', () => {
    seedIndexedPasses(101);
    useToolbarStore.setState({ historyTrackLimit: 'all' });
    const controller = makeController();
    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    const tracks = vi.mocked(controller.showPTracks).mock.calls.at(-1)![0];
    expect(tracks.size).toBe(101);
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

  it('clears pTracks when history pass data is unavailable', () => {
    const controller = {
      syncAircraft: vi.fn(),
      showPTracks: vi.fn(),
      clearPTracks: vi.fn(),
      clearTrack: vi.fn(),
    } as unknown as MapController;
    usePlaybackStore.getState().setMode('history');

    render(<Harness controller={controller} />);

    expect(controller.showPTracks).not.toHaveBeenCalled();
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
