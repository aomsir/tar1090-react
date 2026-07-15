import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { usePlaybackStore } from '@/store/playbackStore';
import { historyStore } from '@/store/historyStore';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { HistoryTrackClipCache, selectHistoryTrackPaths } from './historyTrackSelection';
import type { MapController } from '@/map/MapController';
import { reportHistoryLoadError } from './useReplay';

export const historyTrackClipCache = new HistoryTrackClipCache();

export function usePlayback(
  controllerRef: RefObject<MapController | null>,
  readyVersion = 0,
): void {
  const renderJobRef = useRef(0);
  const mode = usePlaybackStore((s) => s.mode);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const speed = usePlaybackStore((s) => s.speed);
  const version = useLiveTick((s) => s.version);
  const historyTrackLimit = useToolbarStore((s) => s.historyTrackLimit);
  const altitudeFilterEnabled = useToolbarStore((s) => s.altitudeFilterEnabled);
  const altitudeFilterMin = useToolbarStore((s) => s.altitudeFilterMin);
  const altitudeFilterMax = useToolbarStore((s) => s.altitudeFilterMax);
  const selectedPassId = useSelectionStore((s) => s.selectedPassId);

  useEffect(() => {
    if (mode === 'history') {
      const altitudeFilter = altitudeFilterEnabled
        ? { min: altitudeFilterMin, max: altitudeFilterMax }
        : undefined;
      const data = selectHistoryTrackPaths(
        historyStore.drawablePassesRecentFirst,
        historyTrackLimit,
        selectedPassId,
        {
          generation: historyStore.generation,
          altitudeRange: altitudeFilter,
          cache: historyTrackClipCache,
        },
      );
      // Use 3× median frame interval as gap threshold to avoid false
      // "estimated" dashes when frames were sampled at a coarser step.
      const gap = historyStore.frameInterval() * 3;
      const performance = historyStore.performanceRecorder;
      const generation = historyStore.generation;
      const markMapContent = (kind: 'first' | 'full'): void => {
        if (
          performance?.generation !== generation ||
          historyStore.generation !== generation ||
          historyStore.performanceRecorder !== performance
        ) {
          return;
        }
        const elapsed = performance.recorder.elapsedSince('postDownload');
        if (elapsed === undefined) return;
        if (kind === 'first') performance.recorder.markFirstMapContent(elapsed);
        else performance.recorder.markFullMapContent(elapsed);
      };
      if (data.size > 0) {
        const controller = controllerRef.current;
        const renderJob = ++renderJobRef.current;
        const loadGeneration = usePlaybackStore.getState().historyLoadGeneration;
        if (!controller) return;
        usePlaybackStore.getState().setHistoryLoadStage('rendering', loadGeneration);
        const done = controller.showPTracks(data, {
          gapThresholdSec: gap,
          onFirstBatch: () => markMapContent('first'),
          onComplete: () => markMapContent('full'),
        });
        void Promise.resolve(done).then(
          () => {
            const store = usePlaybackStore.getState();
            if (
              renderJobRef.current === renderJob &&
              store.mode === 'history' &&
              store.historyLoadGeneration === loadGeneration &&
              historyStore.generation === generation &&
              historyStore.performanceRecorder === performance
            ) {
              store.setHistoryLoadStage('idle', loadGeneration);
            }
          },
          (error) => {
            const store = usePlaybackStore.getState();
            if (
              renderJobRef.current === renderJob &&
              store.mode === 'history' &&
              store.historyLoadGeneration === loadGeneration
            ) {
              store.setHistoryLoadStage('idle', loadGeneration);
            }
            reportHistoryLoadError(error);
          },
        );
      } else {
        controllerRef.current?.clearPTracks();
        const store = usePlaybackStore.getState();
        store.setHistoryLoadStage('idle', store.historyLoadGeneration);
      }
    } else {
      renderJobRef.current += 1;
      historyTrackClipCache.clear();
      controllerRef.current?.clearPTracks();
    }
  }, [
    mode,
    version,
    historyTrackLimit,
    selectedPassId,
    altitudeFilterEnabled,
    altitudeFilterMin,
    altitudeFilterMax,
    readyVersion,
    controllerRef,
  ]);

  useEffect(() => {
    if (mode !== 'history' || !isPlaying) return;
    let raf = 0;
    let prev = performance.now();
    const step = (now: number): void => {
      const dt = (now - prev) / 1000;
      prev = now;
      const st = usePlaybackStore.getState();
      const next = st.cursorTime + dt * st.speed;
      if (st.bounds && next >= st.bounds.max) {
        st.setCursor(st.bounds.max);
        st.pause();
        return;
      }
      st.setCursor(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mode, isPlaying, speed]);
}
