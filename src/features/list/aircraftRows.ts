import type { Aircraft } from '@/domain/Aircraft';
import type { RawAltitude } from '@/data/types';

export type FilterKey = 'all' | 'airborne' | 'ground' | 'military';
export type SortKey =
  | 'flight'
  | 'registration'
  | 'typeCode'
  | 'squawk'
  | 'altitude'
  | 'speed'
  | 'rssi';
export type SortDir = 'asc' | 'desc';
/** [minLon, minLat, maxLon, maxLat] */
export type Extent = [number, number, number, number];

export interface AircraftRow {
  hex: string;
  flight: string;
  registration: string;
  typeCode: string;
  squawk: string;
  altitude: RawAltitude | undefined;
  speed: number | undefined;
  track: number | undefined;
  messages: number;
  rssi: number | undefined;
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
    squawk: ac.squawk ?? '',
    altitude: ac.altitude,
    speed: ac.speed,
    track: ac.track,
    messages: ac.messages,
    rssi: ac.rssi,
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
    row.registration.toLowerCase().includes(q) ||
    row.typeCode.toLowerCase().includes(q) ||
    row.squawk.toLowerCase().includes(q) ||
    row.country.toLowerCase().includes(q)
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

/** Sort value for a column. Returns null when the value is missing. */
function sortValue(row: AircraftRow, key: SortKey): number | string | null {
  switch (key) {
    case 'altitude':
      if (row.altitude === 'ground') return -1;
      return typeof row.altitude === 'number' ? row.altitude : null;
    case 'speed':
      return typeof row.speed === 'number' ? row.speed : null;
    case 'rssi':
      return typeof row.rssi === 'number' ? row.rssi : null;
    case 'registration':
      return row.registration || null;
    case 'typeCode':
      return row.typeCode || null;
    case 'squawk':
      return row.squawk || null;
    case 'flight':
    default:
      return row.flight || null;
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
    const av = sortValue(a, q.sortKey);
    const bv = sortValue(b, q.sortKey);
    // Missing values always sort last, regardless of direction.
    if (av === null && bv === null) return a.hex.localeCompare(b.hex);
    if (av === null) return 1;
    if (bv === null) return -1;
    const c =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
    if (c !== 0) return c * dir;
    return a.hex.localeCompare(b.hex);
  });
  return rows;
}
