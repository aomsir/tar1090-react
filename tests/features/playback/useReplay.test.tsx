import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useReplay } from '@/features/playback/useReplay';
import { usePlaybackStore } from '@/store/playbackStore';
import { historyStore } from '@/store/historyStore';
import { useSelectionStore } from '@/store/selectionStore';
import type { AircraftSnapshot } from '@/data/types';

const { ensureLoadedMock } = vi.hoisted(() => ({
  ensureLoadedMock: vi.fn(async (onProgress?: (p: { done: number; total: number }) => void) => {
    historyStore.setFrames([
      { now: 100, messages: 0, aircraft: [] as unknown as AircraftSnapshot['aircraft'] },
    ]);
    onProgress?.({ done: 1, total: 1 });
  }),
}));

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
    expect(clearPassData).toHaveBeenCalledOnce();
    expect(historyStore.passes).toEqual([]);
    expect(historyStore.passTracksData).toBeNull();
    expect(usePlaybackStore.getState().mode).toBe('live');
  });
});
