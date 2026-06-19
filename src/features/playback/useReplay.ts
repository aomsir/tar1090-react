import { useCallback } from 'react';
import { usePlaybackStore } from '@/store/playbackStore';
import { useReceiverStore } from '@/store/receiverStore';
import { historyLoader } from '@/data/historyLoader';
import { historyStore } from '@/store/historyStore';

export function useReplay(): {
  enterHistory: () => Promise<void>;
  exitToLive: () => void;
} {
  const enterHistory = useCallback(async () => {
    const store = usePlaybackStore.getState();
    if (store.loading) return;
    store.setLoading(true);
    try {
      await historyLoader.ensureLoaded((p) =>
        usePlaybackStore.getState().setProgress(p.done, p.total),
      );
      const bounds = historyStore.timeBounds();
      usePlaybackStore.getState().setBounds(bounds);
      if (bounds) usePlaybackStore.getState().setCursor(bounds.max);
      usePlaybackStore.getState().setMode('history');
      const { lat, lon } = useReceiverStore.getState();
      await historyStore.buildPTracksData(lat, lon);
    } finally {
      usePlaybackStore.getState().setLoading(false);
    }
  }, []);

  const exitToLive = useCallback(() => {
    const store = usePlaybackStore.getState();
    store.pause();
    store.setMode('live');
    historyStore.clearPTracksData();
  }, []);

  return { enterHistory, exitToLive };
}
