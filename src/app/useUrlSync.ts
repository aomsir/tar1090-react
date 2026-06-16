import { useEffect } from 'react';
import { useSelectionStore } from '@/store/selectionStore';
import { parseQuery } from './urlState';

export function useUrlSync(): void {
  const selectedHex = useSelectionStore((s) => s.selectedHex);
  const select = useSelectionStore((s) => s.select);

  useEffect(() => {
    const { icao } = parseQuery(window.location.search);
    if (icao) select(icao);
  }, [select]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedHex) url.searchParams.set('icao', selectedHex);
    else url.searchParams.delete('icao');
    window.history.replaceState(null, '', url);
  }, [selectedHex]);
}
