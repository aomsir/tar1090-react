import { useCallback } from 'react';
import { usePlaybackStore } from '@/store/playbackStore';
import { useReceiverStore } from '@/store/receiverStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { useSelectionStore } from '@/store/selectionStore';
import { historyLoader } from '@/data/historyLoader';
import { historyStore } from '@/store/historyStore';
import type { HistoryRange } from '@/data/historyLoader';
import { HistoryPerformanceRecorder } from './historyPerformance';
import { HistoryPreprocessCancelledError } from './historyPreprocessClient';

export function reportHistoryLoadError(error: unknown): void {
  if (error instanceof HistoryPreprocessCancelledError) return;
  console.error('[history-load]', error);
}

export function useReplay(): {
  enterHistory: (range: HistoryRange) => Promise<void>;
  exitToLive: () => void;
} {
  const enterHistory = useCallback(async (range: HistoryRange) => {
    const store = usePlaybackStore.getState();
    if (store.loading) return;
    if (store.mode === 'history' && store.range === range) return;
    useSelectionStore.getState().clearAll();
    const loadGeneration = store.beginHistoryLoad();
    const recorder = new HistoryPerformanceRecorder();
    const ownsLoad = (): boolean =>
      usePlaybackStore.getState().historyLoadGeneration === loadGeneration;
    try {
      store.setRange(range);
      store.pause();
      store.setBounds(null);
      store.setMode('live');
      historyStore.clearPassData();
      historyLoader.reset();
      recorder.start('fetch');
      try {
        await historyLoader.ensureLoaded((p) => {
          if (ownsLoad()) usePlaybackStore.getState().setProgress(p.done, p.total);
        }, range);
      } finally {
        recorder.end('fetch');
      }
      if (!ownsLoad()) return;
      usePlaybackStore.getState().setHistoryLoadStage('processing', loadGeneration);
      const bounds = historyStore.timeBounds();
      usePlaybackStore.getState().setBounds(bounds);
      if (bounds) usePlaybackStore.getState().setCursor(bounds.max);
      const { lat, lon } = useReceiverStore.getState();
      const { routeApiEnabled } = useToolbarStore.getState();
      historyStore.performanceRecorder = { generation: historyStore.generation, recorder };
      recorder.start('postDownload');
      try {
        await historyStore.buildPassData(lat, lon, routeApiEnabled, recorder);
      } finally {
        recorder.end('postDownload');
      }
      if (!ownsLoad()) return;
      if (historyStore.drawablePassesRecentFirst.length === 0) {
        usePlaybackStore.getState().setHistoryLoadStage('idle', loadGeneration);
      } else {
        usePlaybackStore.getState().setHistoryLoadStage('rendering', loadGeneration);
      }
      usePlaybackStore.getState().setMode('history');
    } catch (error) {
      if (!ownsLoad()) return;
      if (ownsLoad()) {
        historyStore.reset();
        const current = usePlaybackStore.getState();
        current.pause();
        current.setBounds(null);
        current.setMode('live');
        current.setHistoryLoadStage('idle', loadGeneration);
      }
      throw error;
    } finally {
      if (import.meta.env.DEV) {
        console.info('[history-performance]', recorder.snapshot());
      }
    }
  }, []);

  const exitToLive = useCallback(() => {
    const store = usePlaybackStore.getState();
    useSelectionStore.getState().clearAll();
    store.invalidateHistoryLoad();
    historyLoader.reset();
    historyStore.clearPassData();
    store.pause();
    store.setBounds(null);
    store.setMode('live');
    if (useToolbarStore.getState().statsDashboardOpen) {
      useToolbarStore.setState({ statsDashboardOpen: false });
    }
  }, []);

  return { enterHistory, exitToLive };
}
