import { useEffect, useRef, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PollingSource } from '@/data/pollingSource';
import type { AircraftDataSource } from '@/data/source';
import { aircraftStore } from '@/store/aircraftStore';
import { useStatsStore } from '@/store/statsStore';
import { useLiveTick } from '@/store/liveTick';
import { usePlaybackStore } from '@/store/playbackStore';
import { useReceiverStore } from '@/store/receiverStore';
import type { MapController } from '@/map/MapController';
import { AircraftEnricher } from './AircraftEnricher';
import { enrichAircraft } from '@/domain/enrich';
import { historyLoader } from '@/data/historyLoader';
import { loadLiveHistory } from '@/data/liveHistorySeeder';
import type { AircraftSnapshot } from '@/data/types';
import { routeService } from '@/data/routeService';
import { normalizeCallsign } from '@/domain/callsign';
import { ROUTE_API_URL } from '@/config/api';
import { useToolbarStore } from '@/store/toolbarStore';

type Source = AircraftDataSource & { setRefresh?: (ms: number) => void };

export function useLiveData(
  controllerRef: RefObject<MapController | null>,
  sourceOverride?: Source,
  enricherOverride?: AircraftEnricher,
): void {
  const setStats = useStatsStore((s) => s.setStats);
  const mode = usePlaybackStore((s) => s.mode);

  const sourceRef = useRef<Source | null>(null);
  if (sourceRef.current == null) sourceRef.current = sourceOverride ?? new PollingSource();

  const enricherRef = useRef<AircraftEnricher | null>(enricherOverride ?? null);

  useEffect(() => {
    enricherRef.current ??= new AircraftEnricher(
      (ac) => enrichAircraft(ac),
      () => {
        if (usePlaybackStore.getState().mode === 'live') {
          controllerRef.current?.syncAircraft(aircraftStore.list());
        }
        useLiveTick.getState().bump();
      },
    );
  }, [controllerRef]);

  const { data: receiver } = useQuery({
    queryKey: ['receiver'],
    queryFn: () => sourceRef.current!.getReceiver(),
  });

  useEffect(() => {
    if (!receiver) return;
    if (receiver.refresh && sourceRef.current?.setRefresh)
      sourceRef.current.setRefresh(receiver.refresh);
    historyLoader.setReceiver(receiver);
    useReceiverStore.getState().setReceiverPosition(receiver.lat, receiver.lon);
    // Seed live history for pre-refresh track display
    const src = sourceRef.current;
    if (src && 'getHistoryFrame' in src && receiver.history > 0) {
      const getFrame = (n: number) =>
        (
          src as unknown as { getHistoryFrame: (n: number) => Promise<AircraftSnapshot> }
        ).getHistoryFrame(n);
      void loadLiveHistory(getFrame, receiver.history, 60);
    }
  }, [receiver]);

  useEffect(() => {
    if (mode === 'history') return;
    const unsub = sourceRef.current!.subscribe((snap) => {
      const stats = aircraftStore.applySnapshot(snap);
      setStats(stats);
      if (usePlaybackStore.getState().mode === 'live') {
        controllerRef.current?.syncAircraft(aircraftStore.list());
      }
      enricherRef.current?.enrichPending(aircraftStore.list());

      // Route API: enqueue aircraft with callsign, then flush
      if (useToolbarStore.getState().routeApiEnabled) {
        for (const ac of aircraftStore.list()) {
          if (ac.flight) {
            routeService.enqueue(normalizeCallsign(ac.flight));
          }
        }
        void routeService.flush(ROUTE_API_URL);
      }

      useLiveTick.getState().bump();
    });
    return unsub;
  }, [setStats, controllerRef, mode]);
}
