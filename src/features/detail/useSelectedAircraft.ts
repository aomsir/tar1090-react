import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { aircraftStore } from '@/store/aircraftStore';
import { historyStore } from '@/store/historyStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { toDetail, toPassDetail, type AircraftDetail } from './aircraftDetail';

export function useSelectedAircraft(): AircraftDetail | null {
  const hex = useSelectionStore((s) => s.selectedHex);
  const selectedPassId = useSelectionStore((s) => s.selectedPassId);
  const version = useLiveTick((s) => s.version);
  const mode = usePlaybackStore((s) => s.mode);
  const { t, i18n } = useTranslation();

  return useMemo(() => {
    if (mode === 'history') {
      const pass = historyStore.getPass(selectedPassId);
      return pass ? toPassDetail(pass, t, i18n.language) : null;
    }
    if (!hex) return null;
    const ac = aircraftStore.map.get(hex);
    return ac ? toDetail(ac, t, i18n.language) : null;
    // version drives recompute because aircraftStore mutates in place (non-reactive)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex, selectedPassId, version, mode, t, i18n.language]);
}
