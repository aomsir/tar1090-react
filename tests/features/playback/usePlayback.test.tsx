import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { usePlayback } from '@/features/playback/usePlayback';
import { historyTrackClipCache } from '@/features/playback/usePlayback';
import { Aircraft } from '@/domain/Aircraft';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import { summarizeTrackAltitude } from '@/features/playback/altitudeTracks';
import { buildDrawablePassIndex } from '@/features/playback/historyTracks';
import { usePlaybackStore } from '@/store/playbackStore';
import { historyStore } from '@/store/historyStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
import type { MapController } from '@/map/MapController';
import type { AircraftSnapshot } from '@/data/types';
import { HistoryPerformanceRecorder } from '@/features/playback/historyPerformance';
import type { PTracksSyncOptions } from '@/map/pTracksLayer';

vi.mock('@/domain/enrich', () => ({
  enrichAircraft: vi.fn(async () => {}),
}));

function Harness({
  controller,
  readyVersion = 0,
}: {
  controller: MapController | null;
  readyVersion?: number;
}) {
  const ref = useRef<MapController | null>(null);
  useEffect(() => {
    ref.current = controller;
  }, [controller]);
  usePlayback(ref, readyVersion);
  return null;
}

function indexedPass(passId: string, endTime: number): AircraftPass {
  const hex = passId.split(':')[0]!;
  const trackPoints = [
    { lon: 0, lat: 0, ts: endTime - 1, ground: false },
    { lon: 1, lat: 1, ts: endTime, ground: false },
  ];
  return {
    passId,
    hex,
    startTime: endTime - 10,
    endTime,
    aircraft: new Aircraft(hex),
    trackPoints,
    altitudeSummary: summarizeTrackAltitude(trackPoints),
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

function historyFrames(passCount: number): AircraftSnapshot[] {
  return [
    {
      now: 100,
      messages: passCount,
      aircraft: Array.from({ length: passCount }, (_, index) => ({
        hex: `hex${index}`,
        lat: index,
        lon: index,
      })),
    },
    {
      now: 101,
      messages: passCount * 2,
      aircraft: Array.from({ length: passCount }, (_, index) => ({
        hex: `hex${index}`,
        lat: index + 1,
        lon: index + 1,
      })),
    },
  ];
}

function makeController(): MapController {
  return {
    syncAircraft: vi.fn(),
    showPTracks: vi.fn(),
    clearPTracks: vi.fn(),
    clearTrack: vi.fn(),
  } as unknown as MapController;
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
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

  it('synchronizes history tracks when the controller becomes ready', () => {
    seedIndexedPasses(1);
    usePlaybackStore.getState().setMode('history');
    const controller = makeController();

    const { rerender } = render(<Harness controller={null} readyVersion={0} />);

    expect(controller.showPTracks).not.toHaveBeenCalled();
    rerender(<Harness controller={controller} readyVersion={1} />);

    expect(controller.showPTracks).toHaveBeenCalledOnce();
  });

  it('does not let callbacks from a stale progressive job mark the current generation recorder', () => {
    seedIndexedPasses(1);
    const controller = makeController();
    const oldRecorder = new HistoryPerformanceRecorder(() => 10);
    const currentRecorder = new HistoryPerformanceRecorder(() => 20);
    oldRecorder.start('postDownload');
    historyStore.performanceRecorder = {
      generation: historyStore.generation,
      recorder: oldRecorder,
    };

    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    const oldOptions = vi
      .mocked(controller.showPTracks)
      .mock.calls.at(-1)![1] as PTracksSyncOptions;

    historyStore.setFrames(historyFrames(1));
    currentRecorder.start('postDownload');
    historyStore.performanceRecorder = {
      generation: historyStore.generation,
      recorder: currentRecorder,
    };
    expect(oldOptions.onFirstBatch).toEqual(expect.any(Function));
    expect(oldOptions.onComplete).toEqual(expect.any(Function));
    oldOptions.onFirstBatch!();
    oldOptions.onComplete!();

    expect(oldRecorder.snapshot().firstMapContentMs).toBeUndefined();
    expect(oldRecorder.snapshot().fullMapContentMs).toBeUndefined();
    expect(currentRecorder.snapshot().firstMapContentMs).toBeUndefined();
    expect(currentRecorder.snapshot().fullMapContentMs).toBeUndefined();
  });

  it('marks first and full progressive map content relative to post-download start', () => {
    seedIndexedPasses(1);
    const controller = makeController();
    let now = 10;
    const recorder = new HistoryPerformanceRecorder(() => now);
    recorder.start('postDownload');
    historyStore.performanceRecorder = { generation: historyStore.generation, recorder };

    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    const options = vi.mocked(controller.showPTracks).mock.calls.at(-1)![1] as PTracksSyncOptions;

    now = 25;
    options.onFirstBatch!();
    now = 45;
    options.onComplete!();

    expect(recorder.snapshot().firstMapContentMs).toBe(15);
    expect(recorder.snapshot().fullMapContentMs).toBe(35);
  });

  it('returns rendering to idle only when the current track job completes', async () => {
    seedIndexedPasses(1);
    const first = deferred<void>();
    const second = deferred<void>();
    const controller = makeController();
    vi.mocked(controller.showPTracks)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const loadGeneration = usePlaybackStore.getState().beginHistoryLoad();
    usePlaybackStore.getState().setHistoryLoadStage('rendering', loadGeneration);
    historyStore.performanceRecorder = {
      generation: historyStore.generation,
      recorder: new HistoryPerformanceRecorder(),
    };

    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    expect(usePlaybackStore.getState().historyLoadStage).toBe('rendering');

    act(() => useToolbarStore.getState().setHistoryTrackLimit('all'));
    expect(controller.showPTracks).toHaveBeenCalledTimes(2);
    first.resolve();
    await act(async () => await Promise.resolve());
    expect(usePlaybackStore.getState().historyLoadStage).toBe('rendering');

    second.resolve();
    await act(async () => await Promise.resolve());
    expect(usePlaybackStore.getState().historyLoadStage).toBe('idle');
  });

  it('returns the current rendering job to idle and reports a rejected map sync', async () => {
    seedIndexedPasses(1);
    const controller = makeController();
    const error = new Error('track sync failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(controller.showPTracks).mockRejectedValueOnce(error);
    const loadGeneration = usePlaybackStore.getState().beginHistoryLoad();

    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    await act(async () => await Promise.resolve());

    expect(usePlaybackStore.getState().historyLoadStage).toBe('idle');
    expect(consoleError).toHaveBeenCalledWith('[history-load]', error);
    expect(usePlaybackStore.getState().historyLoadGeneration).toBe(loadGeneration);
  });

  it('returns directly to idle when there are no history tracks to render', () => {
    const controller = makeController();
    usePlaybackStore.getState().beginHistoryLoad();
    render(<Harness controller={controller} />);

    act(() => usePlaybackStore.getState().setMode('history'));

    expect(controller.clearPTracks).toHaveBeenCalled();
    expect(usePlaybackStore.getState().historyLoadStage).toBe('idle');
  });

  it('keeps rendering pending until a map controller becomes available', async () => {
    seedIndexedPasses(1);
    const loadGeneration = usePlaybackStore.getState().beginHistoryLoad();
    usePlaybackStore.getState().setHistoryLoadStage('rendering', loadGeneration);
    const controller = makeController();
    const pending = deferred<void>();
    vi.mocked(controller.showPTracks).mockReturnValueOnce(pending.promise);
    const { rerender } = render(<Harness controller={null} readyVersion={0} />);

    act(() => usePlaybackStore.getState().setMode('history'));
    expect(usePlaybackStore.getState().historyLoadStage).toBe('rendering');

    rerender(<Harness controller={controller} readyVersion={1} />);
    expect(controller.showPTracks).toHaveBeenCalledOnce();
    expect(usePlaybackStore.getState().historyLoadStage).toBe('rendering');

    pending.resolve();
    await act(async () => await Promise.resolve());

    expect(usePlaybackStore.getState().historyLoadStage).toBe('idle');
  });

  it('synchronizes tracks built from history frames when buildPassData bumps the live tick', async () => {
    historyStore.setFrames([
      { now: 100, messages: 1, aircraft: [{ hex: 'abc123', lat: 1, lon: 2 }] },
      { now: 101, messages: 2, aircraft: [{ hex: 'abc123', lat: 3, lon: 4 }] },
      { now: 100_000, messages: 3, aircraft: [{ hex: 'def456', lat: 5, lon: 6 }] },
      { now: 100_001, messages: 4, aircraft: [{ hex: 'def456', lat: 7, lon: 8 }] },
    ]);
    const controller = makeController();

    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    await act(async () => {
      await historyStore.buildPassData(undefined, undefined, false);
    });

    const tracks = vi.mocked(controller.showPTracks).mock.calls.at(-1)![0];
    expect([...tracks.keys()]).toEqual(['def456:100000', 'abc123:100']);
    expect(tracks.get('def456:100000')).toEqual([
      [
        expect.objectContaining({ lon: 6, lat: 5, ts: 100_000 }),
        expect.objectContaining({ lon: 8, lat: 7, ts: 100_001 }),
      ],
    ]);
  });

  it('increments the history generation when frames are replaced', () => {
    const generation = historyStore.generation;

    historyStore.setFrames(historyFrames(1));

    expect(historyStore.generation).toBe(generation + 1);
  });

  it('increments the history generation when history is reset', () => {
    const generation = historyStore.generation;

    historyStore.reset();

    expect(historyStore.generation).toBe(generation + 1);
  });

  it('resynchronizes built history tracks after a limit change without rebuilding passes', async () => {
    historyStore.setFrames(historyFrames(101));
    const controller = makeController();

    render(<Harness controller={controller} />);
    act(() => usePlaybackStore.getState().setMode('history'));
    await act(async () => {
      await historyStore.buildPassData(undefined, undefined, false);
    });
    expect(vi.mocked(controller.showPTracks).mock.calls.at(-1)![0]).toHaveLength(101);
    const index = historyStore.drawablePassesRecentFirst;
    const buildPassData = vi.spyOn(historyStore, 'buildPassData');

    act(() => useToolbarStore.getState().setHistoryTrackLimit(100));

    const tracks = vi.mocked(controller.showPTracks).mock.calls.at(-1)![0];
    expect(tracks.size).toBe(100);
    expect(historyStore.drawablePassesRecentFirst).toBe(index);
    expect(buildPassData).not.toHaveBeenCalled();
    buildPassData.mockRestore();
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

  it('clears cached clipped paths when leaving history mode', () => {
    historyTrackClipCache.setGeneration(1);
    historyTrackClipCache.set('pass', { min: 0, max: 10_000 }, [[]]);
    const controller = makeController();
    render(<Harness controller={controller} />);

    expect(historyTrackClipCache.size).toBe(0);
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
