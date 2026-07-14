import type { AircraftSnapshot } from '@/data/types';
import { Aircraft } from '@/domain/Aircraft';
import type { TrackPoint } from '@/features/track/track';
import type { AircraftPass } from './aircraftPasses';
import type { AltitudeRange } from './altitudeTracks';

export interface HistoryAircraftFilterOptions {
  altitudeRange?: AltitudeRange;
  cursorTime?: number;
  onlyMilitary?: boolean;
  isolation?: boolean;
  selectedHex?: string | null;
  selectedHexes?: ReadonlySet<string>;
  filterGroundVehicles?: boolean;
  filterBlockedMLAT?: boolean;
  selectedPass?: AircraftPass | null;
  passes?: readonly AircraftPass[];
}

function normalizeHex(hex: string): string {
  return hex.trim().toLowerCase();
}

function normalizedHexes(hexes: ReadonlySet<string> | undefined): ReadonlySet<string> | undefined {
  return hexes && new Set([...hexes].map(normalizeHex));
}

function hasFinitePosition(value: { lat?: unknown; lon?: unknown }): boolean {
  return (
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    typeof value.lon === 'number' &&
    Number.isFinite(value.lon)
  );
}

function altitudeInRange(altitude: unknown, range: AltitudeRange): boolean {
  if (altitude === 'ground') return range.min <= 0 && 0 <= range.max;
  return typeof altitude === 'number' && Number.isFinite(altitude) && altitude >= range.min && altitude <= range.max;
}

function matchingPass(
  hex: string,
  cursorTime: number | undefined,
  passes: readonly AircraftPass[] | undefined,
): AircraftPass | undefined {
  if (cursorTime === undefined || !passes) return undefined;
  const normalizedHex = normalizeHex(hex);
  return passes.find(
    (pass) =>
      normalizeHex(pass.hex) === normalizedHex && pass.startTime <= cursorTime && cursorTime <= pass.endTime,
  );
}

function copyDisplayMetadata(target: Aircraft, source: Aircraft): void {
  const hex = target.hex;
  Object.assign(target, source, { hex, positionHistory: [] });
}

function fromFrameAircraft(
  dto: AircraftSnapshot['aircraft'][number],
  now: number,
  pass: AircraftPass | undefined,
): Aircraft {
  const aircraft = new Aircraft(dto.hex);
  if (pass) copyDisplayMetadata(aircraft, pass.aircraft);
  aircraft.update(dto, now);
  return aircraft;
}

function passesNonAltitudeFilters(aircraft: Aircraft, options: HistoryAircraftFilterOptions): boolean {
  if (options.onlyMilitary && !aircraft.isMilitary) return false;
  if (options.isolation) {
    const selectedHexes = normalizedHexes(options.selectedHexes);
    const selectedHex = options.selectedHex && normalizeHex(options.selectedHex);
    if (selectedHexes && selectedHexes.size > 0) {
      if (!selectedHexes.has(aircraft.hex)) return false;
    } else if (selectedHex && aircraft.hex !== selectedHex) {
      return false;
    }
  }
  if (options.filterGroundVehicles && aircraft.category?.startsWith('C')) return false;
  if (options.filterBlockedMLAT && aircraft.hex.startsWith('~')) return false;
  return true;
}

function latestPositionAtOrBefore(
  points: readonly TrackPoint[],
  cursorTime: number,
): TrackPoint | undefined {
  // Pass track points are canonically ordered by timestamp. Find the final
  // eligible timestamp first, then skip only malformed fixture data if present.
  let lo = 0;
  let hi = points.length - 1;
  let index = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].ts <= cursorTime) {
      index = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  for (; index >= 0; index -= 1) {
    const point = points[index];
    if (point.ts <= cursorTime && hasFinitePosition(point)) return point;
  }
  return undefined;
}

function selectedFallback(options: HistoryAircraftFilterOptions): Aircraft | undefined {
  const { selectedHex, selectedPass, cursorTime } = options;
  if (
    !selectedHex ||
    !selectedPass ||
    normalizeHex(selectedPass.hex) !== normalizeHex(selectedHex) ||
    cursorTime === undefined
  ) return undefined;
  if (cursorTime < selectedPass.startTime || cursorTime > selectedPass.endTime) return undefined;
  const point = latestPositionAtOrBefore(selectedPass.trackPoints, cursorTime);
  if (!point) return undefined;

  const aircraft = new Aircraft(normalizeHex(selectedPass.aircraft.hex));
  copyDisplayMetadata(aircraft, selectedPass.aircraft);
  aircraft.update(
    {
      hex: aircraft.hex,
      lat: point.lat,
      lon: point.lon,
      altitude: point.alt,
      track: point.track,
      speed: point.speed,
    },
    point.ts,
  );
  return aircraft;
}

export function selectHistoryAircraft(
  frame: AircraftSnapshot | null,
  options: HistoryAircraftFilterOptions = {},
): Aircraft[] {
  if (!frame) return [];
  const selectedHex = options.selectedHex && normalizeHex(options.selectedHex);
  const aircraft = (frame.aircraft ?? [])
    .filter(hasFinitePosition)
    .map((dto) => {
      const hex = normalizeHex(dto.hex);
      return fromFrameAircraft({ ...dto, hex }, frame.now, matchingPass(hex, options.cursorTime, options.passes));
    });
  const selectedPresent = selectedHex
    ? aircraft.some((item) => item.hex === selectedHex)
    : false;

  if (!selectedPresent) {
    const fallback = selectedFallback(options);
    if (fallback) aircraft.push(fallback);
  }

  return aircraft.filter((item) => {
    if (!passesNonAltitudeFilters(item, options)) return false;
    return item.hex === selectedHex || !options.altitudeRange || altitudeInRange(item.altitude, options.altitudeRange);
  });
}
