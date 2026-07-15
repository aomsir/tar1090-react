import { Aircraft } from '@/domain/Aircraft';
import type { TrackPoint } from '@/features/track/track';
import type { AircraftPass } from './aircraftPasses';
import type { AltitudeRange } from './altitudeTracks';

export interface HistoryAircraftFilterOptions {
  altitudeRange?: AltitudeRange;
  cursorTime?: number;
  onlyMilitary?: boolean;
  selectedHex?: string | null;
  filterGroundVehicles?: boolean;
  filterBlockedMLAT?: boolean;
  selectedPass?: AircraftPass | null;
}

function normalizeHex(hex: string): string {
  return hex.trim().toLowerCase();
}

function hasFinitePosition(value: { lat?: unknown; lon?: unknown }): boolean {
  return (
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    typeof value.lon === 'number' &&
    Number.isFinite(value.lon)
  );
}

function copyDisplayMetadata(target: Aircraft, source: Aircraft): void {
  const hex = target.hex;
  Object.assign(target, source, { hex, positionHistory: [] });
}

function latestPositionAtOrBefore(
  points: readonly TrackPoint[],
  cursorTime: number,
): TrackPoint | undefined {
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
    if (hasFinitePosition(point)) return point;
  }
  return undefined;
}

function selectedAircraft(options: HistoryAircraftFilterOptions): Aircraft | undefined {
  const { selectedHex, selectedPass, cursorTime } = options;
  if (
    !selectedHex ||
    !selectedPass ||
    normalizeHex(selectedPass.hex) !== normalizeHex(selectedHex) ||
    cursorTime === undefined ||
    cursorTime < selectedPass.startTime ||
    cursorTime > selectedPass.endTime
  ) {
    return undefined;
  }

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
  aircraft.isMlat = selectedPass.aircraft.isMlat;
  aircraft.addrType = selectedPass.aircraft.addrType;
  return aircraft;
}

export function selectHistoryAircraft(options: HistoryAircraftFilterOptions = {}): Aircraft[] {
  const aircraft = selectedAircraft(options);
  if (!aircraft) return [];
  if (options.onlyMilitary && !aircraft.isMilitary) return [];
  if (options.filterGroundVehicles && aircraft.category?.startsWith('C')) return [];
  if (options.filterBlockedMLAT && aircraft.hex.startsWith('~')) return [];
  return [aircraft];
}
