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

  it('shows a compact history entry button in live mode without a full-width bar', () => {
    render(<ReplayBar />);
    const btn = screen.getByRole('button', { name: /history/i });
    expect(btn).toBeInTheDocument();
    // Button itself is the replay-bar root — not wrapped in a full-width footer
    expect(btn).toHaveAttribute('data-testid', 'replay-bar');
    expect(btn.tagName).toBe('BUTTON');
    expect(screen.queryByText('All')).not.toBeInTheDocument();
  });

  it('enters history mode on entry click and renders a scrubber', async () => {
    render(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    await waitFor(() => expect(usePlaybackStore.getState().mode).toBe('history'));
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('scrubbing the slider updates cursorTime', async () => {
    render(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    await waitFor(() => expect(screen.queryByRole('slider')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('slider'), { target: { value: '150' } });
    expect(usePlaybackStore.getState().cursorTime).toBe(150);
  });

  it('exits back to live mode', async () => {
    render(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    await waitFor(() => expect(usePlaybackStore.getState().mode).toBe('history'));
    fireEvent.click(screen.getByRole('button', { name: /Exit replay/ }));
    expect(usePlaybackStore.getState().mode).toBe('live');
  });

  it('shows a fullscreen loading overlay with progress', () => {
    usePlaybackStore.setState({ loading: true, progress: { done: 42, total: 100 } });
    render(<ReplayBar />);
    const overlay = screen.getByTestId('replay-bar');
    // Overlay uses fixed positioning (fullscreen)
    expect(overlay.className).toMatch(/fixed/);
    expect(overlay.className).toMatch(/inset-0/);
    expect(screen.getByText(/42\/100/)).toBeInTheDocument();
    expect(screen.getByText(/Loading History/)).toBeInTheDocument();
  });
});
