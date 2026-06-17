import { useEffect, useRef, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PollingSource } from '@/data/pollingSource';
import type { AircraftDataSource } from '@/data/source';
import { aircraftStore } from '@/store/aircraftStore';
import { useStatsStore } from '@/store/statsStore';
import type { MapController } from '@/map/MapController';
import { AircraftEnricher } from './AircraftEnricher';
import { enrichAircraft } from '@/domain/enrich';

type Source = AircraftDataSource & { setRefresh?: (ms: number) => void };

export function useLiveData(
  controllerRef: RefObject<MapController | null>,
  sourceOverride?: Source,
  enricherOverride?: AircraftEnricher,
): void {
  const setStats = useStatsStore((s) => s.setStats);

  const sourceRef = useRef<Source | null>(null);
  if (sourceRef.current == null) sourceRef.current = sourceOverride ?? new PollingSource();

  const enricherRef = useRef<AircraftEnricher | null>(enricherOverride ?? null);

  useEffect(() => {
    enricherRef.current ??= new AircraftEnricher(
      (ac) => enrichAircraft(ac),
      () => controllerRef.current?.syncAircraft(aircraftStore.list()),
    );
  }, [controllerRef]);

  const { data: receiver } = useQuery({
    queryKey: ['receiver'],
    queryFn: () => sourceRef.current!.getReceiver(),
  });

  useEffect(() => {
    if (receiver?.refresh && sourceRef.current?.setRefresh)
      sourceRef.current.setRefresh(receiver.refresh);
  }, [receiver]);

  useEffect(() => {
    const unsub = sourceRef.current!.subscribe((snap) => {
      const stats = aircraftStore.applySnapshot(snap);
      setStats(stats);
      controllerRef.current?.syncAircraft(aircraftStore.list());
      enricherRef.current!.enrichPending(aircraftStore.list());
    });
    return unsub;
  }, [setStats, controllerRef]);
}
