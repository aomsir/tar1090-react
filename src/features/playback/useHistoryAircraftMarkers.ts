import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { MapController } from '@/map/MapController';
import { historyStore } from '@/store/historyStore';
import { useLiveTick } from '@/store/liveTick';
import { usePlaybackStore } from '@/store/playbackStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { selectHistoryAircraft } from './historyAircraft';

export function useHistoryAircraftMarkers(
  controllerRef: RefObject<MapController | null>,
  readyVersion = 0,
): void {
  useEffect(() => {
    let previous: string | null = null;

    const sync = (): void => {
      const playback = usePlaybackStore.getState();
      const controller = controllerRef.current;
      if (!controller) return;
      if (playback.mode !== 'history') {
        if (previous !== null) controller.syncAircraft([]);
        previous = null;
        return;
      }

      const selection = useSelectionStore.getState();
      const toolbar = useToolbarStore.getState();
      const key = JSON.stringify([
        playback.mode,
        playback.cursorTime,
        selection.selectedHex,
        selection.selectedPassId,
        toolbar.altitudeFilterEnabled,
        toolbar.altitudeFilterMin,
        toolbar.altitudeFilterMax,
        toolbar.onlyMilitary,
        toolbar.filterGroundVehicles,
        toolbar.filterBlockedMLAT,
        historyStore.generation,
      ]);
      if (key === previous) return;

      const selectedPass = historyStore.getPass(selection.selectedPassId);
      controller.syncAircraft(
        selectHistoryAircraft({
          selectedHex: selection.selectedHex,
          selectedPass,
          cursorTime: playback.cursorTime,
          onlyMilitary: toolbar.onlyMilitary,
          filterGroundVehicles: toolbar.filterGroundVehicles,
          filterBlockedMLAT: toolbar.filterBlockedMLAT,
          altitudeRange: toolbar.altitudeFilterEnabled
            ? { min: toolbar.altitudeFilterMin, max: toolbar.altitudeFilterMax }
            : undefined,
        }),
      );
      previous = key;
    };

    const unsubscribers = [
      usePlaybackStore.subscribe(sync),
      useSelectionStore.subscribe(sync),
      useToolbarStore.subscribe(sync),
      useLiveTick.subscribe(sync),
    ];
    sync();
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [controllerRef, readyVersion]);
}
