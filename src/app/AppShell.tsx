import { useEffect, useRef, useCallback } from 'react';
import { CommandBar } from '@/ui/CommandBar/CommandBar';
import { ListPanel } from '@/ui/ListPanel/ListPanel';
import { DetailCard } from '@/ui/DetailCard/DetailCard';
import { ReplayBar } from '@/ui/ReplayBar/ReplayBar';
import { AltitudeLegend } from '@/ui/AltitudeLegend/AltitudeLegend';
import { Toolbar } from '@/ui/Toolbar/Toolbar';
import { MapView } from '@/map/MapView';
import { useLiveData } from '@/features/live/useLiveData';
import { useUrlSync } from '@/app/useUrlSync';
import { usePlayback } from '@/features/playback/usePlayback';
import { useSelectedTrack } from '@/features/track/useSelectedTrack';
import { useSelectionStore } from '@/store/selectionStore';
import { useMapViewStore } from '@/store/mapViewStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { Spinner } from '@heroui/react';
import { usePlaybackStore } from '@/store/playbackStore';
import { aircraftStore } from '@/store/aircraftStore';
import { historyStore } from '@/store/historyStore';
import { useSeedVersion } from '@/data/liveHistorySeeder';
import type { MapController } from '@/map/MapController';

export function AppShell() {
  const controllerRef = useRef<MapController | null>(null);
  const selectedHex = useSelectionStore((s) => s.selectedHex);

  useLiveData(controllerRef);
  useUrlSync();
  usePlayback(controllerRef);
  const trackSegments = useSelectedTrack();
  const mode = usePlaybackStore((s) => s.mode);
  const seedLoading = useSeedVersion((s) => s.loading);

  const handleResetView = useCallback(() => {
    controllerRef.current?.resetView();
  }, []);

  const handleRandomPlane = useCallback(() => {
    const list = aircraftStore.list().filter((ac) => ac.hasPosition());
    if (list.length === 0) return;
    const ac = list[Math.floor(Math.random() * list.length)];
    useSelectionStore.getState().select(ac.hex);
    if (typeof ac.lon === 'number' && typeof ac.lat === 'number') {
      controllerRef.current?.centerOn(ac.lon, ac.lat);
    }
  }, []);

  useEffect(() => {
    const unsub = useToolbarStore.subscribe((state, prev) => {
      const c = controllerRef.current;
      if (!c) return;
      if (state.mapDim !== prev.mapDim) c.setDim(state.mapDim);
      if (state.follow !== prev.follow) c.setFollow(state.follow);
      if (
        state.enableLabels !== prev.enableLabels ||
        state.extendedLabels !== prev.extendedLabels ||
        state.trackLabels !== prev.trackLabels
      ) {
        c.setLabelConfig({
          enabled: state.enableLabels,
          extended: state.extendedLabels,
          trackLabels: state.trackLabels,
        });
      }
      if (state.fullscreen !== prev.fullscreen) {
        if (state.fullscreen) c.requestFullscreen();
        else c.exitFullscreen();
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const c = controllerRef.current;
    if (!c) return;
    if (trackSegments.length) c.showTrack(trackSegments);
    else c.clearTrack();
  }, [trackSegments]);

  // Live: show all live aircraft. History: only show the selected aircraft.
  useEffect(() => {
    if (mode === 'live') {
      const { onlyMilitary, isolation, filterGroundVehicles, filterBlockedMLAT } =
        useToolbarStore.getState();
      const { selectedHexes } = useSelectionStore.getState();

      let list = aircraftStore.list();
      if (onlyMilitary) list = list.filter((ac) => ac.isMilitary);
      if (isolation && selectedHexes.size > 0) {
        list = list.filter((ac) => selectedHexes.has(ac.hex));
      }
      if (filterGroundVehicles) list = list.filter((ac) => !ac.category?.startsWith('C'));
      if (filterBlockedMLAT) list = list.filter((ac) => !ac.hex.startsWith('~'));
      controllerRef.current?.syncAircraft(list);

      if (useToolbarStore.getState().follow && selectedHex) {
        const ac = aircraftStore.map.get(selectedHex);
        if (ac && typeof ac.lon === 'number' && typeof ac.lat === 'number') {
          controllerRef.current?.centerOn(ac.lon, ac.lat);
        }
      }
    } else {
      const list = selectedHex
        ? historyStore.allAircraft.filter((ac) => ac.hex === selectedHex)
        : [];
      controllerRef.current?.syncAircraft(list);
    }
  }, [mode, selectedHex]);

  useEffect(() => {
    controllerRef.current?.setSelected(selectedHex);
  }, [selectedHex]);

  const handleSelectFromList = useCallback((hex: string) => {
    useSelectionStore.getState().select(hex);
    const state = usePlaybackStore.getState();
    if (state.mode === 'history') {
      const frame = historyStore.frameAt(state.cursorTime);
      const dto = (frame?.aircraft ?? []).find((a) => a.hex === hex);
      if (dto && typeof dto.lon === 'number' && typeof dto.lat === 'number') {
        controllerRef.current?.centerOn(dto.lon, dto.lat);
      }
    } else {
      const ac = aircraftStore.map.get(hex);
      if (ac && typeof ac.lon === 'number' && typeof ac.lat === 'number') {
        controllerRef.current?.centerOn(ac.lon, ac.lat);
      }
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
      <Toolbar onResetView={handleResetView} onRandomPlane={handleRandomPlane} />
      {seedLoading && mode === 'live' && (
        <div
          data-testid="seed-loading-overlay"
          role="status"
          aria-label="Loading live history data"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        >
          <div className="flex flex-col items-center gap-3 text-white">
            <Spinner size="lg" color="current" />
            <span className="text-sm">Loading…</span>
          </div>
        </div>
      )}
    </div>
  );
}
