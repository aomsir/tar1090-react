import type { RawAltitude } from '@/data/types';
import type { TrackPoint } from '@/features/track/track';

const MIN_ALTITUDE = 0;
const MAX_ALTITUDE = 45_000;
const ALTITUDE_STEP = 500;

export interface AltitudeRange {
  min: number;
  max: number;
}

export interface TrackAltitudeSummary {
  min?: number;
  max?: number;
  hasGround: boolean;
  hasUnknown: boolean;
}

export function normalizeAltitude(value: RawAltitude | undefined): number | undefined {
  if (value === 'ground') return 0;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeRangeEndpoint(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : MIN_ALTITUDE;
  return (
    Math.round(Math.min(MAX_ALTITUDE, Math.max(MIN_ALTITUDE, numeric)) / ALTITUDE_STEP) *
    ALTITUDE_STEP
  );
}

export function normalizeAltitudeRange(min: unknown, max: unknown): AltitudeRange {
  const normalizedMin = normalizeRangeEndpoint(min);
  const normalizedMax = normalizeRangeEndpoint(max);
  return normalizedMin <= normalizedMax
    ? { min: normalizedMin, max: normalizedMax }
    : { min: normalizedMax, max: normalizedMin };
}

export function summarizeTrackAltitude(points: readonly TrackPoint[]): TrackAltitudeSummary {
  const summary: TrackAltitudeSummary = { hasGround: false, hasUnknown: false };

  for (const point of points) {
    const altitude = normalizeAltitude(point.alt);
    if (altitude === undefined) {
      summary.hasUnknown = true;
      continue;
    }
    if (point.alt === 'ground') summary.hasGround = true;
    summary.min = summary.min === undefined ? altitude : Math.min(summary.min, altitude);
    summary.max = summary.max === undefined ? altitude : Math.max(summary.max, altitude);
  }

  return summary;
}

export function altitudeSummaryIntersects(
  summary: TrackAltitudeSummary,
  range: AltitudeRange,
): boolean {
  return (
    summary.min !== undefined &&
    summary.max !== undefined &&
    summary.max >= range.min &&
    summary.min <= range.max
  );
}

function interpolatedNumber(
  from: number | undefined,
  to: number | undefined,
  ratio: number,
): number | undefined {
  const hasFrom = typeof from === 'number' && Number.isFinite(from);
  const hasTo = typeof to === 'number' && Number.isFinite(to);
  if (hasFrom && hasTo) return from + (to - from) * ratio;
  return undefined;
}

function interpolatedHeading(
  from: number | undefined,
  to: number | undefined,
  ratio: number,
): number | undefined {
  if (
    typeof from !== 'number' ||
    !Number.isFinite(from) ||
    typeof to !== 'number' ||
    !Number.isFinite(to)
  ) {
    return interpolatedNumber(from, to, ratio);
  }
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return (from + delta * ratio + 360) % 360;
}

function interpolatePoint(
  from: TrackPoint,
  to: TrackPoint,
  ratio: number,
  altitude: number,
): TrackPoint {
  return {
    lon: from.lon + (to.lon - from.lon) * ratio,
    lat: from.lat + (to.lat - from.lat) * ratio,
    alt: altitude,
    ts: from.ts + (to.ts - from.ts) * ratio,
    track: interpolatedHeading(from.track, to.track, ratio),
    speed: interpolatedNumber(from.speed, to.speed, ratio),
    ground: ratio <= 0.5 ? from.ground : to.ground,
  };
}

function samePoint(left: TrackPoint, right: TrackPoint): boolean {
  return (
    left.lon === right.lon &&
    left.lat === right.lat &&
    left.ts === right.ts &&
    left.alt === right.alt
  );
}

function appendPoint(path: TrackPoint[], point: TrackPoint): void {
  if (!samePoint(path[path.length - 1]!, point)) path.push(point);
}

export function clipTrackToAltitudeRange(
  points: readonly TrackPoint[],
  range: AltitudeRange,
): TrackPoint[][] {
  const paths: TrackPoint[][] = [];
  let current: TrackPoint[] = [];

  const finishCurrent = () => {
    if (current.length >= 2) paths.push(current);
    current = [];
  };

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!;
    const to = points[index]!;
    const fromAltitude = normalizeAltitude(from.alt);
    const toAltitude = normalizeAltitude(to.alt);

    if (fromAltitude === undefined || toAltitude === undefined) {
      finishCurrent();
      continue;
    }

    const delta = toAltitude - fromAltitude;
    if (delta === 0 && (fromAltitude < range.min || fromAltitude > range.max)) {
      finishCurrent();
      continue;
    }
    const lower = delta === 0 ? 0 : (range.min - fromAltitude) / delta;
    const upper = delta === 0 ? 1 : (range.max - fromAltitude) / delta;
    const start = Math.max(0, Math.min(lower, upper));
    const end = Math.min(1, Math.max(lower, upper));
    const entersAtMin = lower <= upper;

    if (start > end) {
      finishCurrent();
      continue;
    }

    if (start === end) {
      const contactPoint =
        start === 0
          ? from
          : start === 1
            ? to
            : interpolatePoint(from, to, start, entersAtMin ? range.min : range.max);
      if (current.length > 0) appendPoint(current, contactPoint);
      finishCurrent();
      continue;
    }

    const startPoint =
      start === 0 ? from : interpolatePoint(from, to, start, entersAtMin ? range.min : range.max);
    const endPoint =
      end === 1 ? to : interpolatePoint(from, to, end, entersAtMin ? range.max : range.min);

    if (current.length === 0 || !samePoint(current[current.length - 1]!, startPoint)) {
      finishCurrent();
      current = [startPoint];
    }
    appendPoint(current, endPoint);
  }

  finishCurrent();
  return paths;
}
