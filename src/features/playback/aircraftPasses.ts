import type { AircraftSnapshot } from '@/data/types';
import { Aircraft } from '@/domain/Aircraft';
import { findCountry, flagPath } from '@/domain/country';
import { distanceNm } from '@/domain/distance';
import type { TrackPoint } from '@/features/track/track';
import { summarizeTrackAltitude, type TrackAltitudeSummary } from './altitudeTracks';

export const AIRCRAFT_PASS_ISOLATION_SECONDS = 12 * 60 * 60;

export interface AircraftPass {
  passId: string;
  hex: string;
  startTime: number;
  endTime: number;
  aircraft: Aircraft;
  trackPoints: TrackPoint[];
  altitudeSummary: TrackAltitudeSummary;
  maxAltitude?: number;
  maxSpeed?: number;
  maxDistance?: number;
  hadAltitude: boolean;
  hadGround: boolean;
  hadEmergency: boolean;
  hadSquawk: boolean;
}

export interface BuildAircraftPassesOptions {
  isolationSeconds?: number;
  siteLat?: number;
  siteLon?: number;
}

function normalizeHex(hex: unknown): string | undefined {
  if (typeof hex !== 'string') return undefined;
  const normalized = hex.trim().toLowerCase();
  return normalized || undefined;
}

function createPass(hex: string, now: number): AircraftPass {
  const aircraft = new Aircraft(hex);
  const country = findCountry(hex);
  aircraft.country = country.country;
  aircraft.flagPath = flagPath(country.country_code);
  return {
    passId: `${hex}:${now}`,
    hex,
    startTime: now,
    endTime: now,
    aircraft,
    trackPoints: [],
    altitudeSummary: { hasGround: false, hasUnknown: false },
    hadAltitude: false,
    hadGround: false,
    hadEmergency: false,
    hadSquawk: false,
  };
}

function updatePeak(current: number | undefined, value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return current;
  return current === undefined ? value : Math.max(current, value);
}

export function buildAircraftPasses(
  frames: AircraftSnapshot[],
  options: BuildAircraftPassesOptions = {},
): AircraftPass[] {
  const isolationSeconds = Number.isFinite(options.isolationSeconds)
    ? options.isolationSeconds!
    : AIRCRAFT_PASS_ISOLATION_SECONDS;
  const active = new Map<string, { pass: AircraftPass; lastSeen: number }>();
  const passes: AircraftPass[] = [];
  const sortedFrames = frames
    .filter((frame) => Number.isFinite(frame.now))
    .slice()
    .sort((a, b) => a.now - b.now);

  for (const frame of sortedFrames) {
    for (const dto of frame.aircraft ?? []) {
      const hex = normalizeHex(dto.hex);
      if (!hex) continue;

      let entry = active.get(hex);
      if (!entry || frame.now - entry.lastSeen >= isolationSeconds) {
        const pass = createPass(hex, frame.now);
        passes.push(pass);
        entry = { pass, lastSeen: frame.now };
        active.set(hex, entry);
      }

      const pass = entry.pass;
      pass.endTime = frame.now;
      entry.lastSeen = frame.now;
      pass.aircraft.update({ ...dto, hex }, frame.now);

      if (dto.altitude === 'ground') {
        pass.hadAltitude = true;
        pass.hadGround = true;
      } else {
        pass.maxAltitude = updatePeak(pass.maxAltitude, dto.altitude);
        if (typeof dto.altitude === 'number' && Number.isFinite(dto.altitude)) {
          pass.hadAltitude = true;
        }
      }
      pass.maxSpeed = updatePeak(pass.maxSpeed, dto.speed);

      if (
        typeof dto.lat === 'number' &&
        Number.isFinite(dto.lat) &&
        typeof dto.lon === 'number' &&
        Number.isFinite(dto.lon)
      ) {
        const last = pass.trackPoints[pass.trackPoints.length - 1];
        if (!last || last.lat !== dto.lat || last.lon !== dto.lon) {
          pass.trackPoints.push({
            lon: dto.lon,
            lat: dto.lat,
            alt: dto.altitude,
            ts: frame.now,
            track: dto.track,
            speed: dto.speed,
            ground: dto.altitude === 'ground',
          });
        }
        pass.maxDistance = updatePeak(
          pass.maxDistance,
          distanceNm(options.siteLat, options.siteLon, dto.lat, dto.lon),
        );
      }

      const emergency = typeof dto.emergency === 'string' ? dto.emergency.trim().toLowerCase() : '';
      if (emergency && emergency !== 'none' && emergency !== 'no emergency') {
        pass.hadEmergency = true;
      }
      if (typeof dto.squawk === 'string' && dto.squawk.trim()) pass.hadSquawk = true;
    }
  }

  for (const pass of passes) pass.altitudeSummary = summarizeTrackAltitude(pass.trackPoints);
  return passes.sort((a, b) => a.startTime - b.startTime || a.hex.localeCompare(b.hex));
}
