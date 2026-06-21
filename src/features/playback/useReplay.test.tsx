import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useReplay } from './useReplay';
import { usePlaybackStore } from '@/store/playbackStore';
import { historyStore } from '@/store/historyStore';
import type { AircraftSnapshot } from '@/data/types';

const { ensureLoadedMock } = vi.hoisted(() => ({
  ensureLoadedMock: vi.fn(async (onProgress?: (p: { done: number; total: number }) => void, _range?: string) => {
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
});
