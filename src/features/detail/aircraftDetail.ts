import type { Aircraft } from '@/domain/Aircraft';
import type { RawAltitude } from '@/data/types';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import type { TFunction } from 'i18next';
import { routeService } from '@/data/routeService';
import { normalizeCallsign } from '@/domain/callsign';
import { useToolbarStore } from '@/store/toolbarStore';
import { formatInteger } from '@/i18n/format';

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
  passId?: string;
  passStartTime?: number;
  passEndTime?: number;
  maxDistance?: number;
}

const dash = (v: string | undefined) => (v && v !== '' ? v : '\u2014');
const feet = (v: number | undefined, language: string | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? `${formatInteger(v, language)} ft` : '\u2014';
const kt = (v: number | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? `${Math.round(v)} kt` : '\u2014';
const deg = (v: number | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? `${Math.round(v)}\u00b0` : '\u2014';
export function toDetail(ac: Aircraft, t: TFunction, language: string | undefined): AircraftDetail {
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
    groups: buildGroups(ac, t, language),
  };
}

export function toPassDetail(
  pass: AircraftPass,
  t: TFunction,
  language: string | undefined,
): AircraftDetail {
  return {
    ...toDetail(pass.aircraft, t, language),
    altitude: pass.maxAltitude ?? (pass.hadGround ? 'ground' : undefined),
    speed: pass.maxSpeed,
    passId: pass.passId,
    passStartTime: pass.startTime,
    passEndTime: pass.endTime,
    maxDistance: pass.maxDistance,
  };
}

function buildGroups(ac: Aircraft, t: TFunction, language: string | undefined): DetailGroup[] {
  const registration = dash(ac.registration);

  const identityRows: { label: string; value: string }[] = [
    { label: t('detail.fields.icao'), value: ac.hex },
    { label: t('detail.fields.registration'), value: registration },
    { label: t('detail.fields.typeCode'), value: ac.typeCode || '\u2014' },
  ];
  if (ac.typeLong) {
    identityRows.push({ label: t('detail.fields.aircraftType'), value: ac.typeLong });
  }
  identityRows.push({ label: t('detail.fields.country'), value: dash(ac.country) });

  if (useToolbarStore.getState().routeApiEnabled) {
    const route = routeService.lookup(normalizeCallsign(ac.flight ?? ''));
    if (route) {
      identityRows.push({ label: t('detail.fields.route'), value: route });
    }
  }

  const identity: DetailGroup = {
    title: t('detail.groups.identity'),
    color: 'indigo',
    rows: identityRows,
  };

  const flightStatus: DetailGroup = {
    title: t('detail.groups.flightStatus'),
    color: 'emerald',
    rows: [
      { label: t('detail.fields.ias'), value: kt(ac.ias) },
      { label: t('detail.fields.tas'), value: kt(ac.tas) },
      {
        label: t('detail.fields.mach'),
        value: typeof ac.mach === 'number' && Number.isFinite(ac.mach) ? `${ac.mach}` : '\u2014',
      },
      {
        label: t('detail.fields.verticalRate'),
        value:
          typeof ac.vertRate === 'number' && Number.isFinite(ac.vertRate)
            ? `${ac.vertRate} ft/min`
            : '\u2014',
      },
      { label: t('detail.fields.squawk'), value: dash(ac.squawk) },
    ],
  };

  const position: DetailGroup = {
    title: t('detail.groups.position'),
    color: 'sky',
    rows: [
      {
        label: t('detail.fields.latitude'),
        value: typeof ac.lat === 'number' ? `${ac.lat.toFixed(4)}\u00b0` : '\u2014',
      },
      {
        label: t('detail.fields.longitude'),
        value: typeof ac.lon === 'number' ? `${ac.lon.toFixed(4)}\u00b0` : '\u2014',
      },
      { label: t('detail.fields.messages'), value: formatInteger(ac.messages, language) },
    ],
  };

  const navigation: DetailGroup = {
    title: t('detail.groups.navigation'),
    color: 'amber',
    rows: [
      { label: t('detail.fields.mcpAltitude'), value: feet(ac.navAltitudeMcp, language) },
      { label: t('detail.fields.fmsAltitude'), value: feet(ac.navAltitudeFms, language) },
      {
        label: t('detail.fields.qnh'),
        value:
          typeof ac.navQnh === 'number' && Number.isFinite(ac.navQnh)
            ? `${ac.navQnh} hPa`
            : '\u2014',
      },
      { label: t('detail.fields.navigationHeading'), value: deg(ac.navHeading) },
    ],
  };

  const environment: DetailGroup = {
    title: t('detail.groups.environment'),
    color: 'teal',
    rows: [
      { label: t('detail.fields.windDirection'), value: deg(ac.windDirection) },
      { label: t('detail.fields.windSpeed'), value: kt(ac.windSpeed) },
      {
        label: t('detail.fields.tat'),
        value:
          typeof ac.tat === 'number' && Number.isFinite(ac.tat) ? `${ac.tat}\u00b0C` : '\u2014',
      },
      {
        label: t('detail.fields.oat'),
        value:
          typeof ac.oat === 'number' && Number.isFinite(ac.oat) ? `${ac.oat}\u00b0C` : '\u2014',
      },
    ],
  };

  const signal: DetailGroup = {
    title: t('detail.groups.signalQuality'),
    color: 'slate',
    rows: [
      {
        label: t('detail.fields.signalDelay'),
        value: Number.isFinite(ac.seen) ? `${ac.seen.toFixed(1)} s` : '\u2014',
      },
      {
        label: t('detail.fields.rssi'),
        value:
          typeof ac.rssi === 'number' && Number.isFinite(ac.rssi)
            ? `${ac.rssi.toFixed(1)} dBFS`
            : '\u2014',
      },
    ],
  };

  return [identity, flightStatus, position, signal, navigation, environment];
}
