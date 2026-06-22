import { useCallback } from 'react';
import { usePlaybackStore } from '@/store/playbackStore';
import { useReceiverStore } from '@/store/receiverStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { historyLoader } from '@/data/historyLoader';
import { historyStore } from '@/store/historyStore';
import type { HistoryRange } from '@/data/historyLoader';

export function useReplay(): {
  enterHistory: (range: HistoryRange) => Promise<void>;
  exitToLive: () => void;
} {
  const enterHistory = useCallback(async (range: HistoryRange) => {
    const store = usePlaybackStore.getState();
    if (store.loading) return;
    if (store.mode === 'history' && store.range === range) return;
    store.setLoading(true);
    try {
      store.setRange(range);
      historyLoader.reset();
      await historyLoader.ensureLoaded(
        (p) => usePlaybackStore.getState().setProgress(p.done, p.total),
        range,
      );
      const bounds = historyStore.timeBounds();
      usePlaybackStore.getState().setBounds(bounds);
      if (bounds) usePlaybackStore.getState().setCursor(bounds.max);
      usePlaybackStore.getState().setMode('history');
      const { lat, lon } = useReceiverStore.getState();
      const { routeApiEnabled } = useToolbarStore.getState();
      await historyStore.buildPTracksData(lat, lon, routeApiEnabled);
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
