import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReplayBar } from './ReplayBar';
import { usePlaybackStore } from '@/store/playbackStore';
import { historyStore } from '@/store/historyStore';
import type { AircraftSnapshot } from '@/data/types';

vi.mock('@/data/historyLoader', () => ({
  historyLoader: {
    ensureLoaded: vi.fn(async (onProgress?: (p: { done: number; total: number }) => void) => {
      historyStore.setFrames([
        { now: 100, messages: 0, aircraft: [] as unknown as AircraftSnapshot['aircraft'] },
        { now: 200, messages: 0, aircraft: [] as unknown as AircraftSnapshot['aircraft'] },
      ]);
      onProgress?.({ done: 2, total: 2 });
    }),
  },
}));

describe('ReplayBar', () => {
  beforeEach(() => {
    usePlaybackStore.getState().reset();
    historyStore.reset();
  });

  it('shows the history entry button in live mode', () => {
    render(<ReplayBar />);
    expect(screen.getByRole('button', { name: /Exit replay/ })).toBeInTheDocument();
  });

  it('enters history mode on entry click and renders a scrubber', async () => {
    render(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /Exit replay/ }));
    await waitFor(() => expect(usePlaybackStore.getState().mode).toBe('history'));
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('scrubbing the slider updates cursorTime', async () => {
    render(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /Exit replay/ }));
    await waitFor(() => expect(screen.queryByRole('slider')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('slider'), { target: { value: '150' } });
    expect(usePlaybackStore.getState().cursorTime).toBe(150);
  });

  it('exits back to live mode', async () => {
    render(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /History/ }));
    await waitFor(() => expect(usePlaybackStore.getState().mode).toBe('history'));
    fireEvent.click(screen.getByRole('button', { name: /History/ }));
    expect(usePlaybackStore.getState().mode).toBe('live');
  });
});
