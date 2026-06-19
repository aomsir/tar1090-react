import { useEffect, useRef, useCallback } from 'react';
import { CommandBar } from '@/ui/CommandBar/CommandBar';
import { ListPanel } from '@/ui/ListPanel/ListPanel';
import { DetailCard } from '@/ui/DetailCard/DetailCard';
import { ReplayBar } from '@/ui/ReplayBar/ReplayBar';
import { AltitudeLegend } from '@/ui/AltitudeLegend/AltitudeLegend';
import { MapView } from '@/map/MapView';
import { useLiveData } from '@/features/live/useLiveData';
import { useUrlSync } from '@/app/useUrlSync';
import { usePlayback } from '@/features/playback/usePlayback';
import { useSelectedTrack } from '@/features/track/useSelectedTrack';
import { useSelectionStore } from '@/store/selectionStore';
import { useMapViewStore } from '@/store/mapViewStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { aircraftStore } from '@/store/aircraftStore';
import { historyStore } from '@/store/historyStore';
import type { MapController } from '@/map/MapController';

export function AppShell() {
  const controllerRef = useRef<MapController | null>(null);
  const selectedHex = useSelectionStore((s) => s.selectedHex);

  useLiveData(controllerRef);
  useUrlSync();
  usePlayback(controllerRef);
  const trackSegments = useSelectedTrack();
  const mode = usePlaybackStore((s) => s.mode);

  useEffect(() => {
    const c = controllerRef.current;
    if (!c) return;
    if (trackSegments.length) c.showTrack(trackSegments);
    else c.clearTrack();
  }, [trackSegments]);

  useEffect(() => {
    if (mode === 'live') controllerRef.current?.syncAircraft(aircraftStore.list());
  }, [mode]);

  useEffect(() => {
    controllerRef.current?.setSelected(selectedHex);
  }, [selectedHex]);

  const handleSelectFromList = useCallback((hex: string) => {
    useSelectionStore.getState().select(hex);
    const state = usePlaybackStore.getState();
    const ac = state.mode === 'history'
      ? historyStore.extractFrameAircraft(state.cursorTime).find((a) => a.hex === hex)
      : aircraftStore.map.get(hex);
    if (ac && typeof ac.lon === 'number' && typeof ac.lat === 'number') {
      controllerRef.current?.centerOn(ac.lon, ac.lat);
    }
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0f1622]">
      <MapView
        onReady={(controller) => {
          controllerRef.current = controller;
          controller.onSelect((hex) => useSelectionStore.getState().select(hex));
          controller.setSelected(useSelectionStore.getState().selectedHex);
          const pushExtent = () => {
            const extent = controller.getViewExtentLonLat();
            if (extent) useMapViewStore.getState().setExtent(extent);
          };
          controller.onViewChange(pushExtent);
          pushExtent();
        }}
      />
      <CommandBar />
      <DetailCard />
      <ListPanel onSelect={handleSelectFromList} />
      <AltitudeLegend />
      <ReplayBar />
    </div>
  );
}
