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
        controllerRef.current?.syncAircraft(aircraftStore.list());
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
    // Share the receiver so history replay does not refetch it.
    historyLoader.setReceiver(receiver);
    useReceiverStore.getState().setReceiverPosition(receiver.lat, receiver.lon);
  }, [receiver]);

  useEffect(() => {
    if (mode === 'history') return;
    const unsub = sourceRef.current!.subscribe((snap) => {
      const stats = aircraftStore.applySnapshot(snap);
      setStats(stats);
      controllerRef.current?.syncAircraft(aircraftStore.list());
      enricherRef.current?.enrichPending(aircraftStore.list());
      useLiveTick.getState().bump();
    });
    return unsub;
  }, [setStats, controllerRef, mode]);
}
