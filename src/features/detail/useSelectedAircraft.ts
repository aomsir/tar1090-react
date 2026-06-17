import { useMemo } from 'react';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { toDetail, type AircraftDetail } from './aircraftDetail';

export function useSelectedAircraft(): AircraftDetail | null {
  const hex = useSelectionStore((s) => s.selectedHex);
  const version = useLiveTick((s) => s.version);

  return useMemo(() => {
    if (!hex) return null;
    const ac = aircraftStore.map.get(hex);
    return ac ? toDetail(ac) : null;
    // version drives recompute because aircraftStore mutates in place (non-reactive)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex, version]);
}
