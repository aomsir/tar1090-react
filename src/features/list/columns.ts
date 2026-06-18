import { formatAltitude } from '@/domain/format';
import {
  formatAge,
  formatCoordinate,
  formatDistanceNm,
  formatRssi,
  formatSpeedKt,
  formatVerticalRate,
} from '@/domain/units';
import type { AircraftRow } from './aircraftRows';

export type ColumnId =
  | 'icao'
  | 'flag'
  | 'flight'
  | 'route'
  | 'registration'
  | 'aircraft_type'
  | 'squawk'
  | 'altitude'
  | 'speed'
  | 'vert_rate'
  | 'distance'
  | 'track'
  | 'msgs'
  | 'seen'
  | 'rssi'
  | 'lat'
  | 'lon'
  | 'data_source'
  | 'military'
  | 'wd'
  | 'ws';

export interface ListColumn {
  id: ColumnId;
  label: string;
  align?: 'left' | 'right' | 'center';
  format: (row: AircraftRow) => string;
  sortValue: (row: AircraftRow) => number | string | null;
}

function missing(value: number | string | undefined): number | string | null {
  return value === undefined || value === '' ? null : value;
}

export const DEFAULT_HIDDEN_COLUMNS: ColumnId[] = [
  'icao',
  'registration',
  'vert_rate',
  'track',
  'msgs',
  'seen',
  'lat',
  'lon',
  'data_source',
  'military',
  'wd',
  'ws',
];

export const LIST_COLUMNS: ListColumn[] = [
  { id: 'icao', label: 'Hex ID', format: (r) => r.hex, sortValue: (r) => r.hex },
  {
    id: 'flag',
    label: '',
    align: 'center',
    format: (r) => r.country,
    sortValue: (r) => missing(r.country),
  },
  { id: 'flight', label: 'Callsign', format: (r) => r.flight, sortValue: (r) => missing(r.flight) },
  { id: 'route', label: 'Route', format: (r) => r.route, sortValue: (r) => missing(r.route) },
  {
    id: 'registration',
    label: 'Registration',
    format: (r) => r.registration,
    sortValue: (r) => missing(r.registration),
  },
  {
    id: 'aircraft_type',
    label: 'Type',
    format: (r) => r.typeCode,
    sortValue: (r) => missing(r.typeCode),
  },
  {
    id: 'squawk',
    label: 'Squawk',
    align: 'right',
    format: (r) => r.squawk,
    sortValue: (r) => missing(r.squawk),
  },
  {
    id: 'altitude',
    label: 'Alt. (ft)',
    align: 'right',
    format: (r) => formatAltitude(r.altitude).replace(' ft', ''),
    sortValue: (r) => (r.altitude === 'ground' ? -100000 : missing(r.altitude)),
  },
  {
    id: 'speed',
    label: 'Spd. (kt)',
    align: 'right',
    format: (r) => formatSpeedKt(r.speed),
    sortValue: (r) => missing(r.speed),
  },
  {
    id: 'vert_rate',
    label: 'V. Rate(ft/min)',
    align: 'right',
    format: (r) => formatVerticalRate(r.vertRate),
    sortValue: (r) => missing(r.vertRate),
  },
  {
    id: 'distance',
    label: 'Dist. (nmi)',
    align: 'right',
    format: (r) => formatDistanceNm(r.distance),
    sortValue: (r) => missing(r.distance),
  },
  {
    id: 'track',
    label: 'Track',
    align: 'right',
    format: (r) => (typeof r.track === 'number' ? `${Math.round(r.track)}°` : ''),
    sortValue: (r) => missing(r.track),
  },
  {
    id: 'msgs',
    label: 'Messages',
    align: 'right',
    format: (r) => r.messages.toString(),
    sortValue: (r) => r.messages,
  },
  {
    id: 'seen',
    label: 'Seen',
    align: 'right',
    format: (r) => formatAge(r.seen),
    sortValue: (r) => missing(r.seen),
  },
  {
    id: 'rssi',
    label: 'RSSI',
    align: 'right',
    format: (r) => formatRssi(r.rssi),
    sortValue: (r) => missing(r.rssi),
  },
  {
    id: 'lat',
    label: 'Latitude',
    align: 'right',
    format: (r) => formatCoordinate(r.lat),
    sortValue: (r) => missing(r.lat),
  },
  {
    id: 'lon',
    label: 'Longitude',
    align: 'right',
    format: (r) => formatCoordinate(r.lon),
    sortValue: (r) => missing(r.lon),
  },
  {
    id: 'data_source',
    label: 'Source',
    align: 'right',
    format: (r) => r.dataSource,
    sortValue: (r) => missing(r.dataSource),
  },
  {
    id: 'military',
    label: 'Mil.',
    align: 'right',
    format: (r) => (r.isMilitary ? 'yes' : 'no'),
    sortValue: (r) => (r.isMilitary ? 'yes' : 'no'),
  },
  {
    id: 'wd',
    label: 'Wind D.',
    align: 'right',
    format: (r) => (typeof r.windDirection === 'number' ? `${Math.round(r.windDirection)}°` : ''),
    sortValue: (r) => missing(r.windDirection),
  },
  {
    id: 'ws',
    label: 'Wind (kt)',
    align: 'right',
    format: (r) => formatSpeedKt(r.windSpeed),
    sortValue: (r) => missing(r.windSpeed),
  },
];

export function visibleColumnIds(hidden: Set<ColumnId>): ColumnId[] {
  return LIST_COLUMNS.filter((c) => !hidden.has(c.id)).map((c) => c.id);
}
