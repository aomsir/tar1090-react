import type { AircraftSnapshot, RawAltitude } from '@/data/types';

export interface TrackPoint {
  lon: number;
  lat: number;
  alt: RawAltitude | undefined;
  ts: number;
  track?: number;
  speed?: number;
  ground: boolean;
}

export interface TrackSegment {
  coords: [number, number][];
  colorKey: string;
  ground: boolean;
  estimated: boolean;
}

export function extractTrackPoints(frames: AircraftSnapshot[], hex: string): TrackPoint[] {
  const pts: TrackPoint[] = [];
  for (const f of frames) {
    const dto = (f.aircraft ?? []).find((a) => a.hex === hex);
    if (!dto) continue;
    if (typeof dto.lat !== 'number' || typeof dto.lon !== 'number') continue;
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
  return pts;
}
