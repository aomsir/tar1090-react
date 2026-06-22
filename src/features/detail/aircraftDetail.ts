import type { Aircraft } from '@/domain/Aircraft';
import type { RawAltitude } from '@/data/types';

export interface DetailRow {
  label: string;
  value: string;
}

export interface DetailGroup {
  title: string;
  color: 'indigo' | 'emerald' | 'sky' | 'amber' | 'teal' | 'slate';
  rows: DetailRow[];
}

export interface AircraftDetail {
  hex: string;
  flight: string;
  registration: string;
  typeCode: string;
  typeLong: string;
  country: string;
  flagPath: string | null;
  altitude: RawAltitude | undefined;
  speed: number | undefined;
  track: number | undefined;
  vertRate: number | undefined;
  squawk: string | undefined;
  messages: number;
  seen: number;
  isMilitary: boolean;
  isMlat: boolean;
  lat: number | undefined;
  lon: number | undefined;
  hasPosition: boolean;
  groups: DetailGroup[];
}

const dash = (v: string | undefined) => (v && v !== '' ? v : '\u2014');
const feet = (v: number | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? `${v.toLocaleString('en-US')} ft` : '\u2014';
const kt = (v: number | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? `${Math.round(v)} kt` : '\u2014';
const deg = (v: number | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? `${Math.round(v)}\u00b0` : '\u2014';
export function toDetail(ac: Aircraft): AircraftDetail {
  return {
    hex: ac.hex,
    flight: ac.flight ?? '',
    registration: ac.registration ?? '',
    typeCode: ac.typeCode ?? '',
    typeLong: ac.typeLong ?? '',
    country: ac.country ?? '',
    flagPath: ac.flagPath ?? null,
    altitude: ac.altitude,
    speed: ac.speed,
    track: ac.track,
    vertRate: ac.vertRate,
    squawk: ac.squawk,
    messages: ac.messages,
    seen: ac.seen,
    isMilitary: ac.isMilitary,
    isMlat: ac.isMlat,
    lat: ac.lat,
    lon: ac.lon,
    hasPosition: ac.hasPosition(),
    groups: buildGroups(ac),
  };
}

function buildGroups(ac: Aircraft): DetailGroup[] {
  const registration = dash(ac.registration);

  const identityRows: { label: string; value: string }[] = [
    { label: 'ICAO', value: ac.hex },
    { label: 'Registration', value: registration },
    { label: 'Type code', value: ac.typeCode || '\u2014' },
  ];
  if (ac.typeLong) {
    identityRows.push({ label: 'Aircraft type', value: ac.typeLong });
  }
  identityRows.push({ label: 'Country', value: dash(ac.country) });

  const identity: DetailGroup = {
    title: 'Identity',
    color: 'indigo',
    rows: identityRows,
  };

  const flightStatus: DetailGroup = {
    title: 'Flight status',
    color: 'emerald',
    rows: [
      { label: 'IAS', value: kt(ac.ias) },
      { label: 'TAS', value: kt(ac.tas) },
      {
        label: 'Mach',
        value: typeof ac.mach === 'number' && Number.isFinite(ac.mach) ? `${ac.mach}` : '\u2014',
      },
      {
        label: 'Vertical rate',
        value:
          typeof ac.vertRate === 'number' && Number.isFinite(ac.vertRate)
            ? `${ac.vertRate} ft/min`
            : '\u2014',
      },
      { label: 'Squawk', value: dash(ac.squawk) },
    ],
  };

  const position: DetailGroup = {
    title: 'Position',
    color: 'sky',
    rows: [
      {
        label: 'Latitude',
        value: typeof ac.lat === 'number' ? `${ac.lat.toFixed(4)}\u00b0` : '\u2014',
      },
      {
        label: 'Longitude',
        value: typeof ac.lon === 'number' ? `${ac.lon.toFixed(4)}\u00b0` : '\u2014',
      },
      { label: 'Messages', value: ac.messages.toLocaleString('en-US') },
    ],
  };

  const navigation: DetailGroup = {
    title: 'Navigation',
    color: 'amber',
    rows: [
      { label: 'MCP altitude', value: feet(ac.navAltitudeMcp) },
      { label: 'FMS altitude', value: feet(ac.navAltitudeFms) },
      {
        label: 'QNH',
        value:
          typeof ac.navQnh === 'number' && Number.isFinite(ac.navQnh)
            ? `${ac.navQnh} hPa`
            : '\u2014',
      },
      { label: 'Navigation heading', value: deg(ac.navHeading) },
    ],
  };

  const environment: DetailGroup = {
    title: 'Environment',
    color: 'teal',
    rows: [
      { label: 'Wind direction', value: deg(ac.windDirection) },
      { label: 'Wind speed', value: kt(ac.windSpeed) },
      {
        label: 'TAT',
        value:
          typeof ac.tat === 'number' && Number.isFinite(ac.tat) ? `${ac.tat}\u00b0C` : '\u2014',
      },
      {
        label: 'OAT',
        value:
          typeof ac.oat === 'number' && Number.isFinite(ac.oat) ? `${ac.oat}\u00b0C` : '\u2014',
      },
    ],
  };

  const signal: DetailGroup = {
    title: 'Signal quality',
    color: 'slate',
    rows: [
      {
        label: 'Signal delay',
        value: Number.isFinite(ac.seen) ? `${ac.seen.toFixed(1)} s` : '\u2014',
      },
      {
        label: 'RSSI',
        value:
          typeof ac.rssi === 'number' && Number.isFinite(ac.rssi)
            ? `${ac.rssi.toFixed(1)} dBFS`
            : '\u2014',
      },
    ],
  };

  return [identity, flightStatus, position, signal, navigation, environment];
}
