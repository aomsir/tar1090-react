import type { Aircraft } from '@/domain/Aircraft';
import type { RawAltitude } from '@/data/types';
import { distanceNm } from '@/domain/distance';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import { LIST_COLUMNS } from './columns';
import type { ColumnId } from './columns';
import { routeService } from '@/data/routeService';
import { normalizeCallsign } from '@/domain/callsign';

export type FilterKey = 'all' | 'airborne' | 'ground' | 'military';
export type SortKey = ColumnId;
export type SortDir = 'asc' | 'desc';
/** [minLon, minLat, maxLon, maxLat] */
export type Extent = [number, number, number, number];

export interface AircraftRow {
  rowId: string;
  passId?: string;
  passStartTime?: number;
  passEndTime?: number;
  hex: string;
  flight: string;
  route: string;
  registration: string;
  typeCode: string;
  squawk: string;
  altitude: RawAltitude | undefined;
  speed: number | undefined;
  vertRate: number | undefined;
  distance: number | undefined;
  track: number | undefined;
  messages: number;
  seen: number;
  rssi: number | undefined;
  lat: number | undefined;
  lon: number | undefined;
  dataSource: string;
  country: string;
  flagPath: string | null;
  isMilitary: boolean;
  isMlat: boolean;
  windDirection: number | undefined;
  windSpeed: number | undefined;
  lastSeenTime: number | undefined;
}

export interface RowQuery {
  query: string;
  filter: FilterKey;
  sortKey: SortKey;
  sortDir: SortDir;
  inViewOnly: boolean;
  extent: Extent | null;
  siteLat?: number;
  siteLon?: number;
}

export function toRow(ac: Aircraft, distance?: number, routeApiEnabled = false): AircraftRow {
  return {
    rowId: ac.hex,
    hex: ac.hex,
    flight: ac.flight ?? '',
    route: routeApiEnabled ? (routeService.lookup(normalizeCallsign(ac.flight ?? '')) ?? '') : '',
    registration: ac.registration ?? '',
    typeCode: ac.typeCode ?? '',
    squawk: ac.squawk ?? '',
    altitude: ac.altitude,
    speed: ac.speed,
    vertRate: ac.vertRate ?? ac.baroRate ?? ac.geomRate,
    distance,
    track: ac.track,
    messages: ac.messages,
    seen: ac.seen,
    rssi: ac.rssi,
    lat: ac.lat,
    lon: ac.lon,
    dataSource: ac.addrType ?? '',
    country: ac.country ?? '',
    flagPath: ac.flagPath ?? null,
    isMilitary: ac.isMilitary,
    isMlat: ac.isMlat,
    windDirection: ac.windDirection,
    windSpeed: ac.windSpeed,
    lastSeenTime: ac.lastUpdated === 0 ? undefined : ac.lastUpdated,
  };
}

function toPassRow(pass: AircraftPass, routeApiEnabled = false): AircraftRow {
  const row = toRow(pass.aircraft, pass.maxDistance, routeApiEnabled);
  return {
    ...row,
    rowId: pass.passId,
    passId: pass.passId,
    passStartTime: pass.startTime,
    passEndTime: pass.endTime,
    altitude: pass.maxAltitude ?? (pass.hadGround ? 'ground' : undefined),
    speed: pass.maxSpeed,
    distance: pass.maxDistance,
  };
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

const SORT_COLUMNS = new Map(LIST_COLUMNS.map((c) => [c.id, c]));

function sortValue(row: AircraftRow, key: SortKey): number | string | null {
  return SORT_COLUMNS.get(key)?.sortValue(row) ?? null;
}

function filterAndSortRows(rows: AircraftRow[], q: RowQuery): AircraftRow[] {
  const filtered = rows.filter(
    (r) =>
      matchesQuery(r, q.query) &&
      matchesFilter(r, q.filter) &&
      (!q.inViewOnly || isInExtent(r.lon, r.lat, q.extent)),
  );
  const dir = q.sortDir === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    const av = sortValue(a, q.sortKey);
    const bv = sortValue(b, q.sortKey);
    // Missing values always sort last, regardless of direction.
    if (av === null && bv === null) return a.rowId.localeCompare(b.rowId);
    if (av === null) return 1;
    if (bv === null) return -1;
    const c =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
    if (c !== 0) return c * dir;
    return a.rowId.localeCompare(b.rowId);
  });
  return filtered;
}

export function buildRows(list: Aircraft[], q: RowQuery, routeApiEnabled = false): AircraftRow[] {
  return filterAndSortRows(
    list.map((ac) => toRow(ac, distanceNm(q.siteLat, q.siteLon, ac.lat, ac.lon), routeApiEnabled)),
    q,
  );
}

export function buildPassRows(
  passes: AircraftPass[],
  q: RowQuery,
  routeApiEnabled = false,
): AircraftRow[] {
  return filterAndSortRows(
    passes.map((pass) => toPassRow(pass, routeApiEnabled)),
    q,
  );
}
