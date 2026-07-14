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
  label?: string;
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

function lastCoord(segment: TrackSegment): [number, number] | undefined {
  return segment.coords[segment.coords.length - 1];
}

const continuingSegments = new WeakSet<TrackSegment>();

export function trackSegmentContinues(segment: TrackSegment): boolean {
  return continuingSegments.has(segment);
}

export function* iterateTrackSegments(
  points: Iterable<TrackPoint>,
  opts: { gapThresholdSec?: number } = {},
): Generator<TrackSegment> {
  const gap = opts.gapThresholdSec ?? 90;
  let cur: TrackSegment | null = null;
  let prev: TrackPoint | null = null;

  // A continuous final LineString is complete only after its last point is consumed.
  for (const point of points) {
    const coord: [number, number] = [point.lon, point.lat];
    if (prev && point.ts - prev.ts > gap) {
      if (cur) {
        continuingSegments.add(cur);
        yield cur;
        cur = null;
      }
      const estimated: TrackSegment = {
        coords: [[prev.lon, prev.lat], coord],
        colorKey: colorOf(prev),
        ground: false,
        estimated: true,
      };
      continuingSegments.add(estimated);
      yield estimated;
    }

    const key = colorOf(point);
    if (cur && cur.colorKey === key && cur.ground === point.ground) {
      cur.coords.push(coord);
    } else {
      const prior: TrackSegment | null = cur;
      let startCoord: [number, number] | undefined;
      if (prior) {
        startCoord = lastCoord(prior);
        continuingSegments.add(prior);
        yield prior;
      }
      cur = {
        coords: startCoord ? [startCoord, coord] : [coord],
        colorKey: key,
        ground: point.ground,
        estimated: false,
        label: point.ground ? 'GND' : typeof point.alt === 'number' ? `${point.alt} ft` : undefined,
      };
    }
    prev = point;
  }

  if (cur) yield cur;
}

export function buildTrackSegments(
  points: TrackPoint[],
  opts: { gapThresholdSec?: number } = {},
): TrackSegment[] {
  return Array.from(iterateTrackSegments(points, opts));
}
