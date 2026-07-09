import { useMemo } from 'react';
import { aircraftStore } from '@/store/aircraftStore';
import { historyStore } from '@/store/historyStore';
import { useLiveTick } from '@/store/liveTick';
import { useListControls } from '@/store/listControls';
import { useMapViewStore } from '@/store/mapViewStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { useReceiverStore } from '@/store/receiverStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { buildPassRows, buildRows, type AircraftRow } from './aircraftRows';

export function useAircraftRows(): AircraftRow[] {
  const mode = usePlaybackStore((s) => s.mode);
  const version = useLiveTick((s) => s.version);
  const query = useListControls((s) => s.query);
  const filter = useListControls((s) => s.filter);
  const sortKey = useListControls((s) => s.sortKey);
  const sortDir = useListControls((s) => s.sortDir);
  const inViewOnly = useToolbarStore((s) => s.inViewOnly);
  const routeApiEnabled = useToolbarStore((s) => s.routeApiEnabled);
  const extent = useMapViewStore((s) => s.extent);
  const siteLat = useReceiverStore((s) => s.lat);
  const siteLon = useReceiverStore((s) => s.lon);

  return useMemo(
    () => {
      const rowQuery = { query, filter, sortKey, sortDir, inViewOnly, extent, siteLat, siteLon };
      return mode === 'history'
        ? buildPassRows(historyStore.passes, rowQuery, routeApiEnabled)
        : buildRows(aircraftStore.list(), rowQuery, routeApiEnabled);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      mode,
      version,
      query,
      filter,
      sortKey,
      sortDir,
      inViewOnly,
      routeApiEnabled,
      extent,
      siteLat,
      siteLon,
    ],
  );
}
