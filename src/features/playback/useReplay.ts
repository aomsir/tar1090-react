import { useCallback } from 'react';
import { usePlaybackStore } from '@/store/playbackStore';
import { historyLoader } from '@/data/historyLoader';
import { historyStore } from '@/store/historyStore';

export function useReplay(): {
  enterHistory: () => Promise<void>;
  exitToLive: () => void;
} {
  const enterHistory = useCallback(async () => {
    const store = usePlaybackStore.getState();
    store.setLoading(true);
    await historyLoader.ensureLoaded((p) =>
      usePlaybackStore.getState().setProgress(p.done, p.total),
    );
    const bounds = historyStore.timeBounds();
    usePlaybackStore.getState().setBounds(bounds);
    if (bounds) usePlaybackStore.getState().setCursor(bounds.max);
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setLoading(false);
  }, []);

  const exitToLive = useCallback(() => {
    const store = usePlaybackStore.getState();
    store.pause();
    store.setMode('live');
  }, []);

  return { enterHistory, exitToLive };
}
