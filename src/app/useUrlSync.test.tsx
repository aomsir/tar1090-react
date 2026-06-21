import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useUrlSync } from './useUrlSync';
import { useSelectionStore } from '@/store/selectionStore';
import { usePlaybackStore } from '@/store/playbackStore';

const enterHistoryMock = vi.fn();

vi.mock('@/features/playback/useReplay', () => ({
  useReplay: () => ({ enterHistory: enterHistoryMock, exitToLive: vi.fn() }),
}));

function Harness() {
  useUrlSync();
  return null;
}

describe('useUrlSync', () => {
  beforeEach(() => {
    enterHistoryMock.mockClear();
    useSelectionStore.setState({ selectedHex: null });
    usePlaybackStore.getState().reset();
    window.history.replaceState(null, '', '/');
  });

  it('reads ?icao= on mount and selects it', () => {
    window.history.replaceState(null, '', '/?icao=abc123');
    render(<Harness />);
    expect(useSelectionStore.getState().selectedHex).toBe('abc123');
  });

  it('writes ?icao= to the URL when selection changes', () => {
    render(<Harness />);
    act(() => useSelectionStore.getState().select('781860'));
    expect(window.location.search).toBe('?icao=781860');
    act(() => useSelectionStore.getState().select(null));
    expect(window.location.search).toBe('');
  });

  it('enters history mode on mount from ?mode=history', () => {
    window.history.replaceState(null, '', '/?mode=history');
    render(<Harness />);
    expect(enterHistoryMock).toHaveBeenCalledTimes(1);
    expect(enterHistoryMock).toHaveBeenCalledWith('1d');
  });

  it('syncs playback mode to the URL', () => {
    render(<Harness />);
    act(() => usePlaybackStore.getState().setMode('history'));
    expect(window.location.search).toBe('?mode=history');
    act(() => usePlaybackStore.getState().setMode('live'));
    expect(window.location.search).toBe('');
  });
});
