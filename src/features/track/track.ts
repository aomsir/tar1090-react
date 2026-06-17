import type { AircraftSnapshot, RawAltitude } from '@/data/types';
import { altitudeColor, hslString } from '@/domain/altitude';

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

const colorOf = (p: TrackPoint): string => hslString(altitudeColor(p.alt));

export function buildTrackSegments(
  points: TrackPoint[],
  opts: { gapThresholdSec?: number } = {},
): TrackSegment[] {
  const gap = opts.gapThresholdSec ?? 90;
  const segs: TrackSegment[] = [];
  let cur: TrackSegment | null = null;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const coord: [number, number] = [p.lon, p.lat];
    if (i > 0) {
      const prev = points[i - 1];
      if (p.ts - prev.ts > gap) {
        segs.push({
          coords: [[prev.lon, prev.lat], coord],
          colorKey: colorOf(prev),
          ground: false,
          estimated: true,
        });
        cur = null;
      }
    }
    const key = colorOf(p);
    if (cur && cur.colorKey === key && cur.ground === p.ground) {
      cur.coords.push(coord);
    } else {
      const startCoord: [number, number] | null =
        cur && cur.coords.length ? cur.coords[cur.coords.length - 1] : null;
      cur = {
        coords: startCoord ? [startCoord, coord] : [coord],
        colorKey: key,
        ground: p.ground,
        estimated: false,
      };
      segs.push(cur);
    }
  }
  return segs;
}
