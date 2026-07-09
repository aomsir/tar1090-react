import { formatAltitude, ALTITUDE_GROUND } from '@/domain/format';
import {
  formatAge,
  formatCoordinate,
  formatDistanceNm,
  formatRssi,
  formatSpeedKt,
  formatTimestamp,
  formatVerticalRate,
} from '@/domain/units';
import type { TFunction } from 'i18next';
import type { AircraftRow } from './aircraftRows';
import { formatPassTimeRange } from '@/i18n/format';

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
  | 'ws'
  | 'last_seen'
  | 'pass_time';

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

function formatDataSource(source: string): string {
  switch (source) {
    case 'uat':
      return 'UAT';
    case 'mlat':
      return 'MLAT';
    case 'adsb':
    case 'adsb_icao':
    case 'adsb_other':
      return 'ADS-B';
    case 'adsb_icao_nt':
      return 'ADS-B noTP';
    case 'adsr':
    case 'adsr_icao':
    case 'adsr_other':
      return 'ADS-R or UAT';
    case 'tisb_icao':
    case 'tisb_trackfile':
    case 'tisb_other':
    case 'tisb':
      return 'TIS-B';
    case 'modeS':
    case 'mode_s':
      return 'Mode S';
    case 'ais':
      return 'AIS';
    case 'mode_ac':
      return 'Mode A/C';
    case 'adsc':
      return 'Sat. ADS-C';
    case 'other':
      return 'Other';
    case 'unknown':
      return 'Unknown';
    case '':
      return '';
    default:
      return 'Unknown';
  }
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
  'last_seen',
  'route',
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
    format: (r) => formatDataSource(r.dataSource),
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
  {
    id: 'last_seen',
    label: 'Last Seen',
    align: 'right',
    format: (r) => formatTimestamp(r.lastSeenTime),
    sortValue: (r) => missing(r.lastSeenTime),
  },
  { id: 'pass_time', label: 'Pass Time', format: () => '', sortValue: (r) => r.passStartTime ?? null },
];

export function visibleColumnIds(hidden: Set<ColumnId>): ColumnId[] {
  return LIST_COLUMNS.filter((c) => !hidden.has(c.id)).map((c) => c.id);
}

const COLUMN_HEADER_KEYS: Record<ColumnId, string> = {
  icao: 'icao',
  flag: '',
  flight: 'callsign',
  route: 'route',
  registration: 'registration',
  aircraft_type: 'type',
  squawk: 'squawk',
  altitude: 'altitude',
  speed: 'speed',
  vert_rate: 'verticalRate',
  distance: 'distance',
  track: 'track',
  msgs: 'messages',
  seen: 'seen',
  rssi: 'rssi',
  lat: 'latitude',
  lon: 'longitude',
  data_source: 'source',
  military: 'military',
  wd: 'windDirection',
  ws: 'wind',
  last_seen: 'lastSeen',
  pass_time: 'passTime',
};

export function createListColumns(t: TFunction, language?: string): ListColumn[] {
  return LIST_COLUMNS.map((col) => {
    const headerKey = COLUMN_HEADER_KEYS[col.id];
    const label = headerKey ? t(`list.columnHeaders.${headerKey}`) : '';
    if (col.id === 'military') {
      return {
        ...col,
        label,
        format: (r: AircraftRow) => (r.isMilitary ? t('list.values.yes') : t('list.values.no')),
      };
    }
    if (col.id === 'data_source') {
      return {
        ...col,
        label,
        format: (r: AircraftRow) => translateDataSource(r.dataSource, t),
      };
    }
    if (col.id === 'altitude') {
      return {
        ...col,
        label,
        format: (r: AircraftRow) => {
          if (r.altitude === 'ground') return t('list.ground');
          const formatted = formatAltitude(r.altitude);
          return formatted === ALTITUDE_GROUND ? t('list.ground') : formatted.replace(' ft', '');
        },
      };
    }
    if (col.id === 'pass_time') {
      return {
        ...col,
        label,
        format: (r: AircraftRow) =>
          r.passStartTime !== undefined && r.passEndTime !== undefined
            ? formatPassTimeRange(r.passStartTime, r.passEndTime, language)
            : '',
      };
    }
    return { ...col, label };
  });
}

function translateDataSource(source: string, t: TFunction): string {
  const raw = formatDataSource(source);
  if (raw === 'Other') return t('list.dataSources.other');
  if (raw === 'Unknown') return t('list.dataSources.unknown');
  return raw;
}
