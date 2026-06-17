import { useMemo } from 'react';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useListControls } from '@/store/listControls';
import { useMapViewStore } from '@/store/mapViewStore';
import { buildRows, type AircraftRow } from './aircraftRows';

export function useAircraftRows(): AircraftRow[] {
  const version = useLiveTick((s) => s.version);
  const query = useListControls((s) => s.query);
  const filter = useListControls((s) => s.filter);
  const sortKey = useListControls((s) => s.sortKey);
  const sortDir = useListControls((s) => s.sortDir);
  const inViewOnly = useListControls((s) => s.inViewOnly);
  const extent = useMapViewStore((s) => s.extent);

  return useMemo(
    () => buildRows(aircraftStore.list(), { query, filter, sortKey, sortDir, inViewOnly, extent }),
    [version, query, filter, sortKey, sortDir, inViewOnly, extent],
  );
}
