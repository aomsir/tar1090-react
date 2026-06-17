import { describe, it, expect, beforeEach } from 'vitest';
import { usePlaybackStore } from './playbackStore';

describe('playbackStore', () => {
  beforeEach(() => usePlaybackStore.getState().reset());

  it('clamps setCursor to bounds', () => {
    const s = usePlaybackStore.getState();
    s.setBounds({ min: 100, max: 200 });
    s.setCursor(50);
    expect(usePlaybackStore.getState().cursorTime).toBe(100);
    s.setCursor(999);
    expect(usePlaybackStore.getState().cursorTime).toBe(200);
    s.setCursor(150);
    expect(usePlaybackStore.getState().cursorTime).toBe(150);
  });

  it('toggles play/pause and mode and stores progress', () => {
    const s = usePlaybackStore.getState();
    s.play();
    expect(usePlaybackStore.getState().isPlaying).toBe(true);
    s.pause();
    expect(usePlaybackStore.getState().isPlaying).toBe(false);
    s.setMode('history');
    expect(usePlaybackStore.getState().mode).toBe('history');
    s.setProgress(3, 10);
    expect(usePlaybackStore.getState().progress).toEqual({ done: 3, total: 10 });
  });

  it('reset returns to live defaults', () => {
    const s = usePlaybackStore.getState();
    s.setMode('history');
    s.play();
    s.setBounds({ min: 1, max: 2 });
    usePlaybackStore.getState().reset();
    const st = usePlaybackStore.getState();
    expect(st.mode).toBe('live');
    expect(st.isPlaying).toBe(false);
    expect(st.bounds).toBeNull();
  });
});
