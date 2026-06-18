import { useMemo } from 'react';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useListControls } from '@/store/listControls';
import { useMapViewStore } from '@/store/mapViewStore';
import { useReceiverStore } from '@/store/receiverStore';
import { buildRows, type AircraftRow } from './aircraftRows';

export function useAircraftRows(): AircraftRow[] {
  const version = useLiveTick((s) => s.version);
  const query = useListControls((s) => s.query);
  const filter = useListControls((s) => s.filter);
  const sortKey = useListControls((s) => s.sortKey);
  const sortDir = useListControls((s) => s.sortDir);
  const inViewOnly = useListControls((s) => s.inViewOnly);
  const extent = useMapViewStore((s) => s.extent);
  const siteLat = useReceiverStore((s) => s.lat);
  const siteLon = useReceiverStore((s) => s.lon);

  return useMemo(
    () =>
      buildRows(aircraftStore.list(), {
        query,
        filter,
        sortKey,
        sortDir,
        inViewOnly,
        extent,
        siteLat,
        siteLon,
      }),
    // version drives recompute because aircraftStore mutates in place (non-reactive)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, query, filter, sortKey, sortDir, inViewOnly, extent, siteLat, siteLon],
  );
}
