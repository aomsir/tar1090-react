import { useCallback } from 'react';
import { usePlaybackStore } from '@/store/playbackStore';
import { useReceiverStore } from '@/store/receiverStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { useSelectionStore } from '@/store/selectionStore';
import { historyLoader } from '@/data/historyLoader';
import { historyStore } from '@/store/historyStore';
import type { HistoryRange } from '@/data/historyLoader';
import { HistoryPerformanceRecorder } from './historyPerformance';

export function useReplay(): {
  enterHistory: (range: HistoryRange) => Promise<void>;
  exitToLive: () => void;
} {
  const enterHistory = useCallback(async (range: HistoryRange) => {
    const store = usePlaybackStore.getState();
    if (store.loading) return;
    if (store.mode === 'history' && store.range === range) return;
    useSelectionStore.getState().clearAll();
    store.setLoading(true);
    const recorder = new HistoryPerformanceRecorder();
    try {
      store.setRange(range);
      historyLoader.reset();
      recorder.start('fetch');
      try {
        await historyLoader.ensureLoaded(
          (p) => usePlaybackStore.getState().setProgress(p.done, p.total),
          range,
        );
      } finally {
        recorder.end('fetch');
      }
      const bounds = historyStore.timeBounds();
      usePlaybackStore.getState().setBounds(bounds);
      if (bounds) usePlaybackStore.getState().setCursor(bounds.max);
      usePlaybackStore.getState().setMode('history');
      const { lat, lon } = useReceiverStore.getState();
      const { routeApiEnabled } = useToolbarStore.getState();
      recorder.start('postDownload');
      try {
        await historyStore.buildPassData(lat, lon, routeApiEnabled, recorder);
      } finally {
        recorder.end('postDownload');
      }
    } finally {
      if (import.meta.env.DEV) {
        console.info('[history-performance]', recorder.snapshot());
      }
      usePlaybackStore.getState().setLoading(false);
    }
  }, []);

  const exitToLive = useCallback(() => {
    const store = usePlaybackStore.getState();
    useSelectionStore.getState().clearAll();
    historyStore.clearPassData();
    store.pause();
    store.setMode('live');
    if (useToolbarStore.getState().statsDashboardOpen) {
      useToolbarStore.setState({ statsDashboardOpen: false });
    }
  }, []);

  return { enterHistory, exitToLive };
}
