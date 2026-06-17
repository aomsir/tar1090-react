import type { Aircraft } from '@/domain/Aircraft';
import type { RawAltitude } from '@/data/types';

export type FilterKey = 'all' | 'airborne' | 'ground' | 'military';
export type SortKey = 'flight' | 'registration' | 'typeCode' | 'altitude' | 'speed';
export type SortDir = 'asc' | 'desc';
/** [minLon, minLat, maxLon, maxLat] */
export type Extent = [number, number, number, number];

export interface AircraftRow {
  hex: string;
  flight: string;
  registration: string;
  typeCode: string;
  altitude: RawAltitude | undefined;
  speed: number | undefined;
  track: number | undefined;
  country: string;
  flagPath: string | null;
  isMilitary: boolean;
  isMlat: boolean;
  lon: number | undefined;
  lat: number | undefined;
}

export interface RowQuery {
  query: string;
  filter: FilterKey;
  sortKey: SortKey;
  sortDir: SortDir;
  inViewOnly: boolean;
  extent: Extent | null;
}

export function toRow(ac: Aircraft): AircraftRow {
  return {
    hex: ac.hex,
    flight: ac.flight ?? '',
    registration: ac.registration ?? '',
    typeCode: ac.typeCode ?? '',
    altitude: ac.altitude,
    speed: ac.speed,
    track: ac.track,
    country: ac.country ?? '',
    flagPath: ac.flagPath ?? null,
    isMilitary: ac.isMilitary,
    isMlat: ac.isMlat,
    lon: ac.lon,
    lat: ac.lat,
  };
}

export function altitudeSortValue(alt: RawAltitude | undefined): number {
  if (alt === 'ground') return -1;
  if (typeof alt === 'number') return alt;
  return -Infinity;
}

export function matchesQuery(row: AircraftRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.hex.toLowerCase().includes(q) ||
    row.flight.toLowerCase().includes(q) ||
    row.registration.toLowerCase().includes(q)
  );
}

export function matchesFilter(row: AircraftRow, filter: FilterKey): boolean {
  switch (filter) {
    case 'airborne':
      return typeof row.altitude === 'number';
    case 'ground':
      return row.altitude === 'ground';
    case 'military':
      return row.isMilitary;
    case 'all':
    default:
      return true;
  }
}

export function isInExtent(
  lon: number | undefined,
  lat: number | undefined,
  extent: Extent | null,
): boolean {
  if (extent == null) return true;
  if (typeof lon !== 'number' || typeof lat !== 'number') return false;
  const [minLon, minLat, maxLon, maxLat] = extent;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

function compare(a: AircraftRow, b: AircraftRow, key: SortKey): number {
  switch (key) {
    case 'altitude':
      return altitudeSortValue(a.altitude) - altitudeSortValue(b.altitude);
    case 'speed':
      return (a.speed ?? -Infinity) - (b.speed ?? -Infinity);
    case 'registration':
      return a.registration.localeCompare(b.registration);
    case 'typeCode':
      return a.typeCode.localeCompare(b.typeCode);
    case 'flight':
    default:
      return a.flight.localeCompare(b.flight);
  }
}

export function buildRows(list: Aircraft[], q: RowQuery): AircraftRow[] {
  const rows = list
    .map(toRow)
    .filter(
      (r) =>
        matchesQuery(r, q.query) &&
        matchesFilter(r, q.filter) &&
        (!q.inViewOnly || isInExtent(r.lon, r.lat, q.extent)),
    );
  const dir = q.sortDir === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    const c = compare(a, b, q.sortKey);
    if (c !== 0) return c * dir;
    return a.hex.localeCompare(b.hex);
  });
  return rows;
}
