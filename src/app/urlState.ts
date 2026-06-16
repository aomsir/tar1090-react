export interface MapUrlState {
  icao: string | null;
}

export function parseQuery(search: string): MapUrlState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return { icao: params.get('icao') };
}

export function buildQuery(state: MapUrlState): string {
  const params = new URLSearchParams();
  if (state.icao) params.set('icao', state.icao);
  const s = params.toString();
  return s ? `?${s}` : '';
}
