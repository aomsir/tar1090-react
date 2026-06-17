import type { Aircraft } from '@/domain/Aircraft';
import type { RawAltitude } from '@/data/types';

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
}

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
  };
}
