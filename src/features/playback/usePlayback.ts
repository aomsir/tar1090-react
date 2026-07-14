import { useEffect } from 'react';
import type { RefObject } from 'react';
import { usePlaybackStore } from '@/store/playbackStore';
import { historyStore } from '@/store/historyStore';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { HistoryTrackClipCache, selectHistoryTrackPaths } from './historyTrackSelection';
import type { MapController } from '@/map/MapController';

export const historyTrackClipCache = new HistoryTrackClipCache();

export function usePlayback(controllerRef: RefObject<MapController | null>): void {
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
      if (data.size > 0) controllerRef.current?.showPTracks(data, gap);
      else controllerRef.current?.clearPTracks();
    } else {
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
