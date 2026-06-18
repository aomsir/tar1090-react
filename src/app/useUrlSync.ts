import { useEffect } from 'react';
import { useSelectionStore } from '@/store/selectionStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useReplay } from '@/features/playback/useReplay';
import { parseQuery } from './urlState';

export function useUrlSync(): void {
  const selectedHex = useSelectionStore((s) => s.selectedHex);
  const select = useSelectionStore((s) => s.select);
  const mode = usePlaybackStore((s) => s.mode);
  const { enterHistory } = useReplay();

  useEffect(() => {
    const { icao, mode: urlMode } = parseQuery(window.location.search);
    if (icao) select(icao);
    if (urlMode === 'history') void enterHistory();
  }, [select, enterHistory]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedHex) url.searchParams.set('icao', selectedHex);
    else url.searchParams.delete('icao');
    if (mode === 'history') url.searchParams.set('mode', 'history');
    else url.searchParams.delete('mode');
    window.history.replaceState(null, '', url);
  }, [selectedHex, mode]);
}
