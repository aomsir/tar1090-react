import { useEffect, useMemo, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PollingSource } from '@/data/pollingSource';
import type { AircraftDataSource } from '@/data/source';
import { aircraftStore } from '@/store/aircraftStore';
import { useStatsStore } from '@/store/statsStore';
import type { MapController } from '@/map/MapController';

type Source = AircraftDataSource & { setRefresh?: (ms: number) => void };

export function useLiveData(
  controllerRef: RefObject<MapController | null>,
  sourceOverride?: Source,
): void {
  const setStats = useStatsStore((s) => s.setStats);

  const source = useMemo<Source>(() => sourceOverride ?? new PollingSource(), []);

  const { data: receiver } = useQuery({
    queryKey: ['receiver'],
    queryFn: () => source.getReceiver(),
  });

  useEffect(() => {
    if (receiver?.refresh && source.setRefresh) source.setRefresh(receiver.refresh);
  }, [receiver, source]);

  useEffect(() => {
    const unsub = source.subscribe((snap) => {
      const stats = aircraftStore.applySnapshot(snap);
      setStats(stats);
      controllerRef.current?.syncAircraft(aircraftStore.list());
    });
    return unsub;
  }, [source, setStats, controllerRef]);
}
