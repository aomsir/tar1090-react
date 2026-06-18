import type { PlaybackMode } from '@/store/playbackStore';

export interface MapUrlState {
  icao: string | null;
  mode: PlaybackMode;
}

export function parseQuery(search: string): MapUrlState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const rawMode = params.get('mode');
  const mode: PlaybackMode = rawMode === 'history' ? 'history' : 'live';
  return { icao: params.get('icao'), mode };
}

export function buildQuery(state: MapUrlState): string {
  const params = new URLSearchParams();
  if (state.icao) params.set('icao', state.icao);
  if (state.mode === 'history') params.set('mode', state.mode);
  const s = params.toString();
  return s ? `?${s}` : '';
}
