import { useMemo } from 'react';
import { aircraftStore } from '@/store/aircraftStore';
import { historyStore } from '@/store/historyStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { toDetail, type AircraftDetail } from './aircraftDetail';

export function useSelectedAircraft(): AircraftDetail | null {
  const hex = useSelectionStore((s) => s.selectedHex);
  const version = useLiveTick((s) => s.version);
  const mode = usePlaybackStore((s) => s.mode);

  return useMemo(() => {
    if (!hex) return null;
    if (mode === 'history') {
      const historyAc = historyStore.allAircraft.find((a) => a.hex === hex);
      return historyAc ? toDetail(historyAc) : null;
    }
    const ac = aircraftStore.map.get(hex);
    return ac ? toDetail(ac) : null;
    // version drives recompute because aircraftStore mutates in place (non-reactive)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex, version, mode]);
}
