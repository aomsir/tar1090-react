import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useReplay } from '@/features/playback/useReplay';
import { usePlaybackStore } from '@/store/playbackStore';
import { historyStore } from '@/store/historyStore';
import { useSelectionStore } from '@/store/selectionStore';
import { historyLoader } from '@/data/historyLoader';
import { HistoryPreprocessCancelledError } from '@/features/playback/historyPreprocessClient';
import type { AircraftSnapshot } from '@/data/types';

const { ensureLoadedMock } = vi.hoisted(() => ({
  ensureLoadedMock: vi.fn(async (onProgress?: (p: { done: number; total: number }) => void) => {
    historyStore.setFrames([
      { now: 100, messages: 0, aircraft: [] as unknown as AircraftSnapshot['aircraft'] },
    ]);
    onProgress?.({ done: 1, total: 1 });
  }),
}));

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

vi.mock('@/data/historyLoader', () => ({
  historyLoader: {
    ensureLoaded: ensureLoadedMock,
    reset: vi.fn(),
  },
  HISTORY_RANGES: [
    { key: '1d', seconds: 86400 },
    { key: '3d', seconds: 259200 },
    { key: '1w', seconds: 604800 },
    { key: '1m', seconds: 2592000 },
    { key: 'unlimited', seconds: Infinity },
  ],
}));

function Harness({ onReady }: { onReady: (r: ReturnType<typeof useReplay>) => void }) {
  const replay = useReplay();
  onReady(replay);
  return null;
}

describe('useReplay', () => {
  beforeEach(() => {
    usePlaybackStore.getState().reset();
    historyStore.reset();
    ensureLoadedMock.mockClear();
    vi.mocked(historyLoader.reset).mockClear();
    useSelectionStore.getState().clearAll();
  });

  it('does not call ensureLoaded twice when enterHistory is invoked while loading', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    await act(async () => {
      await Promise.all([replay!.enterHistory('1d'), replay!.enterHistory('1d')]);
    });

    expect(ensureLoadedMock).toHaveBeenCalledTimes(1);
  });

  it('skips enterHistory entirely when loading is already true', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    usePlaybackStore.setState({ loading: true });

    await act(async () => {
      await replay!.enterHistory('1d');
    });

    expect(ensureLoadedMock).not.toHaveBeenCalled();
  });

  it('skips enterHistory when already in history mode with the same range', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    await act(async () => {
      await replay!.enterHistory('1d');
    });

    expect(ensureLoadedMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await replay!.enterHistory('1d');
    });

    // Should not call ensureLoaded again — same range in history mode
    expect(ensureLoadedMock).toHaveBeenCalledTimes(1);
  });

  it('does call enterHistory when range differs even in history mode', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    await act(async () => {
      await replay!.enterHistory('1d');
    });

    expect(ensureLoadedMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await replay!.enterHistory('3d');
    });

    // Different range — should reload
    expect(ensureLoadedMock).toHaveBeenCalledTimes(2);
    expect(ensureLoadedMock).toHaveBeenLastCalledWith(expect.any(Function), '3d');
  });

  it('passes range to historyLoader.ensureLoaded', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    await act(async () => {
      await replay!.enterHistory('1w');
    });

    expect(ensureLoadedMock).toHaveBeenCalledWith(expect.any(Function), '1w');
  });

  it('calls historyLoader.reset before ensureLoaded', async () => {
    const { historyLoader } = await import('@/data/historyLoader');
    let replay: ReturnType<typeof useReplay> | null = null;
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    await act(async () => {
      await replay!.enterHistory('3d');
    });

    expect(historyLoader.reset).toHaveBeenCalled();
  });

  it('clears selection and loading when history loading fails', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    ensureLoadedMock.mockRejectedValueOnce(new Error('load failed'));
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    useSelectionStore.setState({
      selectedPassId: 'abc123:100',
      selectedHex: 'abc123',
      selectedHexes: new Set(['abc123']),
    });
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    await act(async () => {
      await expect(replay!.enterHistory('1d')).rejects.toThrow('load failed');
    });

    expect(usePlaybackStore.getState()).toMatchObject({ loading: false, mode: 'live' });
    expect(useSelectionStore.getState()).toMatchObject({
      selectedPassId: null,
      selectedHex: null,
    });
    expect(useSelectionStore.getState().selectedHexes).toEqual(new Set());
    expect(log).toHaveBeenCalledWith(
      '[history-performance]',
      expect.objectContaining({ phases: { fetch: expect.any(Number) } }),
    );
  });

  it('clears an existing history session when fetching a replacement range fails', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    historyStore.setFrames([
      { now: 100, messages: 0, aircraft: [] as unknown as AircraftSnapshot['aircraft'] },
    ]);
    historyStore.passes = [{} as never];
    usePlaybackStore.setState({
      mode: 'history',
      bounds: { min: 100, max: 200 },
      range: '1d',
    });
    ensureLoadedMock.mockRejectedValueOnce(new Error('replacement fetch failed'));
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    await act(async () => {
      await expect(replay!.enterHistory('3d')).rejects.toThrow('replacement fetch failed');
    });

    expect(usePlaybackStore.getState()).toMatchObject({
      mode: 'live',
      bounds: null,
      historyLoadStage: 'idle',
      loading: false,
    });
    expect(historyStore.frames).toEqual([]);
    expect(historyStore.passes).toEqual([]);
  });

  it('clears an existing history session when processing fails', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    historyStore.setFrames([
      { now: 100, messages: 0, aircraft: [] as unknown as AircraftSnapshot['aircraft'] },
    ]);
    historyStore.passes = [{} as never];
    usePlaybackStore.setState({
      mode: 'history',
      bounds: { min: 100, max: 200 },
      range: '1d',
    });
    const buildPassData = vi
      .spyOn(historyStore, 'buildPassData')
      .mockRejectedValueOnce(new Error('processing failed'));
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    await act(async () => {
      await expect(replay!.enterHistory('3d')).rejects.toThrow('processing failed');
    });

    expect(usePlaybackStore.getState()).toMatchObject({
      mode: 'live',
      bounds: null,
      historyLoadStage: 'idle',
      loading: false,
    });
    expect(historyStore.frames).toEqual([]);
    expect(historyStore.passes).toEqual([]);
    buildPassData.mockRestore();
  });

  it('does not let an exited history request reset a newer load stage', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    const pending = deferred<void>();
    ensureLoadedMock.mockImplementationOnce(() => pending.promise);
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    let first: Promise<void>;
    act(() => {
      first = replay!.enterHistory('1d');
    });
    expect(usePlaybackStore.getState().historyLoadStage).toBe('fetching');

    act(() => replay!.exitToLive());
    const secondGeneration = usePlaybackStore.getState().beginHistoryLoad();
    usePlaybackStore.getState().setHistoryLoadStage('processing', secondGeneration);
    pending.resolve();
    await act(async () => {
      await first!;
    });

    expect(usePlaybackStore.getState().historyLoadStage).toBe('processing');
  });

  it('resolves a superseded cancelled load without rolling back the newer stage', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    const pending = deferred<void>();
    ensureLoadedMock.mockImplementationOnce(() => pending.promise);
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    let first: Promise<void>;
    act(() => {
      first = replay!.enterHistory('1d');
    });
    act(() => replay!.exitToLive());
    const newerGeneration = usePlaybackStore.getState().beginHistoryLoad();
    usePlaybackStore.getState().setHistoryLoadStage('processing', newerGeneration);
    pending.reject(new HistoryPreprocessCancelledError());

    await expect(first!).resolves.toBeUndefined();
    expect(usePlaybackStore.getState()).toMatchObject({
      historyLoadGeneration: newerGeneration,
      historyLoadStage: 'processing',
      mode: 'live',
    });
  });

  it('rethrows a cancellation for the current history load after rolling back safely', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    ensureLoadedMock.mockRejectedValueOnce(new HistoryPreprocessCancelledError());
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );

    await expect(replay!.enterHistory('1d')).rejects.toBeInstanceOf(
      HistoryPreprocessCancelledError,
    );
    expect(usePlaybackStore.getState()).toMatchObject({
      historyLoadStage: 'idle',
      mode: 'live',
      loading: false,
    });
  });

  it('clears complete pass selection and pass data when exiting to live', async () => {
    let replay: ReturnType<typeof useReplay> | null = null;
    render(
      <Harness
        onReady={(r) => {
          replay = r;
        }}
      />,
    );
    useSelectionStore.getState().select('abc123');
    const clearPassData = vi.spyOn(historyStore, 'clearPassData');
    const { historyLoader } = await import('@/data/historyLoader');

    await act(async () => {
      await replay!.enterHistory('1d');
    });

    expect(useSelectionStore.getState().selectedHex).toBeNull();
    useSelectionStore.setState({
      selectedPassId: 'abc123:100',
      selectedHex: 'abc123',
      selectedHexes: new Set(['abc123']),
    });
    act(() => replay!.exitToLive());
    expect(useSelectionStore.getState()).toMatchObject({
      selectedPassId: null,
      selectedHex: null,
    });
    expect(useSelectionStore.getState().selectedHexes).toEqual(new Set());
    expect(clearPassData).toHaveBeenCalledTimes(2);
    expect(historyLoader.reset).toHaveBeenCalledTimes(2);
    expect(historyStore.passes).toEqual([]);
    expect(historyStore.passTracksData).toBeNull();
    expect(usePlaybackStore.getState().mode).toBe('live');
  });
});
