import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CommandBar } from '@/ui/CommandBar/CommandBar';
import { ListPanel } from '@/ui/ListPanel/ListPanel';
import { DetailCard } from '@/ui/DetailCard/DetailCard';
import { ReplayBar } from '@/ui/ReplayBar/ReplayBar';
import { AltitudeLegend } from '@/ui/AltitudeLegend/AltitudeLegend';
import { Toolbar } from '@/ui/Toolbar/Toolbar';
import { StatsDashboard } from '@/ui/StatsDashboard/StatsDashboard';
import { MobileTopBar } from '@/ui/mobile/MobileTopBar';
import { MobileToolbar } from '@/ui/mobile/MobileToolbar';
import { MobileDetailSheet } from '@/ui/mobile/MobileDetailSheet';
import { MobileHistoryLoading } from '@/ui/mobile/MobileHistoryLoading';
import { MapView } from '@/map/MapView';
import { useLiveData } from '@/features/live/useLiveData';
import { useUrlSync } from '@/app/useUrlSync';
import { useIsMobile } from '@/app/useIsMobile';
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
import { useLiveTick } from '@/store/liveTick';
import type { MapController } from '@/map/MapController';
import type { TrackPoint } from '@/features/track/track';

export function AppShell() {
  const { t } = useTranslation();
  const controllerRef = useRef<MapController | null>(null);
  const selectedHex = useSelectionStore((s) => s.selectedHex);
  const selectedPassId = useSelectionStore((s) => s.selectedPassId);
  const selectedHexes = useSelectionStore((s) => s.selectedHexes);
  const onlyMilitary = useToolbarStore((s) => s.onlyMilitary);
  const isolation = useToolbarStore((s) => s.isolation);
  const filterGroundVehicles = useToolbarStore((s) => s.filterGroundVehicles);
  const filterBlockedMLAT = useToolbarStore((s) => s.filterBlockedMLAT);
  const follow = useToolbarStore((s) => s.follow);
  const allTracks = useToolbarStore((s) => s.allTracks);
  const liveVersion = useLiveTick((s) => s.version);
  const isMobile = useIsMobile();

  useLiveData(controllerRef);
  useUrlSync();
  usePlayback(controllerRef);
  const trackSegments = useSelectedTrack();
  const mode = usePlaybackStore((s) => s.mode);
  const seedLoading = useSeedVersion((s) => s.loading);
  const statsDashboardOpen = useToolbarStore((s) => s.statsDashboardOpen);

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
      if (state.follow !== prev.follow) {
        c.setFollow(state.follow);
        if (state.follow) {
          const hex = useSelectionStore.getState().selectedHex;
          if (hex) {
            const ac = aircraftStore.map.get(hex);
            if (ac && typeof ac.lon === 'number' && typeof ac.lat === 'number') {
              c.centerOn(ac.lon, ac.lat);
            }
          }
        }
      }
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

  // Live: show all live aircraft. History: show only the selected pass aircraft.
  useEffect(() => {
    if (mode === 'live') {
      let list = aircraftStore.list();
      if (onlyMilitary) list = list.filter((ac) => ac.isMilitary);
      if (isolation) {
        if (selectedHexes.size > 0) list = list.filter((ac) => selectedHexes.has(ac.hex));
        else if (selectedHex) list = list.filter((ac) => ac.hex === selectedHex);
      }
      if (filterGroundVehicles) list = list.filter((ac) => !ac.category?.startsWith('C'));
      if (filterBlockedMLAT) list = list.filter((ac) => !ac.hex.startsWith('~'));
      controllerRef.current?.syncAircraft(list);

      if (follow && selectedHex) {
        const ac = aircraftStore.map.get(selectedHex);
        if (ac && typeof ac.lon === 'number' && typeof ac.lat === 'number') {
          controllerRef.current?.centerOn(ac.lon, ac.lat);
        }
      }
    } else {
      const pass = historyStore.getPass(selectedPassId);
      controllerRef.current?.syncAircraft(pass ? [pass.aircraft] : []);
    }
  }, [
    mode,
    selectedHex,
    selectedPassId,
    selectedHexes,
    onlyMilitary,
    isolation,
    filterGroundVehicles,
    filterBlockedMLAT,
    follow,
  ]);

  useEffect(() => {
    controllerRef.current?.setSelected(selectedHex);
  }, [selectedHex]);

  useEffect(() => {
    controllerRef.current?.setSelectedTrackKey(mode === 'history' ? selectedPassId : selectedHex);
  }, [mode, selectedHex, selectedPassId]);

  useEffect(() => {
    if (mode !== 'live') return;
    const c = controllerRef.current;
    if (!c) return;
    if (!allTracks) {
      c.clearPTracks();
      return;
    }
    const tracks = new globalThis.Map<string, TrackPoint[]>();
    for (const ac of aircraftStore.list()) {
      if (ac.positionHistory.length < 2) continue;
      tracks.set(
        ac.hex,
        ac.positionHistory.map((p) => ({
          lon: p.lon,
          lat: p.lat,
          alt: p.alt,
          ts: p.ts,
          track: p.track,
          speed: p.speed,
          ground: p.ground,
        })),
      );
    }
    c.showPTracks(tracks);
  }, [allTracks, mode, liveVersion]);

  const handleSelectFromList = useCallback((rowId: string) => {
    const state = usePlaybackStore.getState();
    if (state.mode === 'history') {
      const pass = historyStore.getPass(rowId);
      if (!pass) return;
      useSelectionStore.getState().selectPass(pass.passId, pass.hex);
      const point = pass.trackPoints.at(-1);
      if (point) {
        controllerRef.current?.centerOn(point.lon, point.lat);
      }
    } else {
      useSelectionStore.getState().select(rowId);
      const ac = aircraftStore.map.get(rowId);
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
          controller.onSelect((mapSelection) => {
            const selection = useSelectionStore.getState();
            if (mapSelection === null) {
              selection.clearAll();
              return;
            }
            const playback = usePlaybackStore.getState();
            if (mapSelection.type === 'historyTrack') {
              if (playback.mode !== 'history') return;
              const pass = historyStore.getPass(mapSelection.passId);
              if (pass) selection.selectPass(pass.passId, pass.hex);
              return;
            }

            const { hex } = mapSelection;
            if (
              playback.mode !== 'history' ||
              !selection.selectedPassId ||
              selection.selectedHex !== hex
            ) {
              selection.select(hex);
            }
          });
          controller.setSelected(useSelectionStore.getState().selectedHex);
          const selection = useSelectionStore.getState();
          controller.setSelectedTrackKey(
            usePlaybackStore.getState().mode === 'history'
              ? selection.selectedPassId
              : selection.selectedHex,
          );

          const toolbarState = useToolbarStore.getState();
          controller.setLabelConfig({
            enabled: toolbarState.enableLabels,
            extended: toolbarState.extendedLabels,
            trackLabels: toolbarState.trackLabels,
          });

          const pushExtent = () => {
            const extent = controller.getViewExtentLonLat();
            if (extent) useMapViewStore.getState().setExtent(extent);
          };
          controller.onViewChange(pushExtent);
          pushExtent();
        }}
      />
      {isMobile ? (
        <>
          <MobileTopBar onSelect={handleSelectFromList} />
          <MobileToolbar onResetView={handleResetView} />
          <MobileDetailSheet />
          <MobileHistoryLoading />
          {!selectedHex && <AltitudeLegend />}
        </>
      ) : (
        <>
          <CommandBar />
          <DetailCard />
          <div
            data-testid="right-dock"
            className="pointer-events-none absolute bottom-16 right-4 top-16 z-10 flex items-center gap-3"
          >
            <div data-testid="toolbar-dock-slot" className="pointer-events-auto">
              <Toolbar onResetView={handleResetView} onRandomPlane={handleRandomPlane} />
            </div>
            <div data-testid="list-dock-slot" className="pointer-events-auto h-full">
              <ListPanel onSelect={handleSelectFromList} />
            </div>
          </div>
          <AltitudeLegend />
          <ReplayBar />
        </>
      )}
      {seedLoading && mode === 'live' && (
        <div
          data-testid="seed-loading-overlay"
          role="status"
          aria-label={t('app.loadingLiveHistory')}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        >
          <div className="flex flex-col items-center gap-3 text-white">
            <Spinner size="lg" color="current" />
            <span className="text-sm">{t('app.loading')}</span>
          </div>
        </div>
      )}
      {!isMobile && statsDashboardOpen && <StatsDashboard />}
    </div>
  );
}
