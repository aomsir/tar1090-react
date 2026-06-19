import type { AircraftSnapshot } from '@/data/types';
import type { TrackPoint } from '@/features/track/track';
import { distanceNm } from '@/domain/distance';
import { Aircraft } from '@/domain/Aircraft';
import { findCountry, flagPath } from '@/domain/country';

export function buildPTracks(frames: AircraftSnapshot[]): Map<string, TrackPoint[]> {
  const map = new Map<string, TrackPoint[]>();
  for (const f of frames) {
    for (const dto of f.aircraft ?? []) {
      if (typeof dto.lat !== 'number' || typeof dto.lon !== 'number') continue;
      let pts = map.get(dto.hex);
      if (!pts) {
        pts = [];
        map.set(dto.hex, pts);
      }
      const last = pts[pts.length - 1];
      if (last && last.lon === dto.lon && last.lat === dto.lat) continue;
      pts.push({
        lon: dto.lon,
        lat: dto.lat,
        alt: dto.altitude,
        ts: f.now,
        track: dto.track,
        speed: dto.speed,
        ground: dto.altitude === 'ground',
      });
    }
  }
  return map;
}

export interface PeakStats {
  maxSpeed: number | undefined;
  maxDist: number | undefined;
}

export function buildPeakStats(
  frames: AircraftSnapshot[],
  siteLat?: number,
  siteLon?: number,
): Map<string, PeakStats> {
  const map = new Map<string, PeakStats>();
  for (const f of frames) {
    for (const dto of f.aircraft ?? []) {
      let stats = map.get(dto.hex);
      if (!stats) {
        stats = { maxSpeed: undefined, maxDist: undefined };
        map.set(dto.hex, stats);
      }
      if (typeof dto.speed === 'number') {
        stats.maxSpeed =
          stats.maxSpeed !== undefined ? Math.max(stats.maxSpeed, dto.speed) : dto.speed;
      }
      const d = distanceNm(siteLat, siteLon, dto.lat, dto.lon);
      if (d !== undefined) {
        stats.maxDist = stats.maxDist !== undefined ? Math.max(stats.maxDist, d) : d;
      }
    }
  }
  return map;
}

export function buildAllHistoryAircraft(frames: AircraftSnapshot[]): Aircraft[] {
  const map = new Map<string, Aircraft>();
  for (const f of frames) {
    for (const dto of f.aircraft ?? []) {
      let ac = map.get(dto.hex);
      if (!ac) {
        ac = new Aircraft(dto.hex);
        const range = findCountry(dto.hex);
        ac.country = range.country;
        ac.flagPath = flagPath(range.country_code);
        map.set(dto.hex, ac);
      }
      ac.update(dto, f.now);
    }
  }
  return Array.from(map.values());
}
