import type { TrackPoint } from '@/features/track/track';
import type { AircraftPass } from './aircraftPasses';

export const HISTORY_TRACK_LIMITS = [100, 500, 1000, 2000, 5000, 'all'] as const;

export type HistoryTrackLimit = (typeof HISTORY_TRACK_LIMITS)[number];

export function normalizeHistoryTrackLimit(value: unknown): HistoryTrackLimit {
  return HISTORY_TRACK_LIMITS.includes(value as HistoryTrackLimit)
    ? (value as HistoryTrackLimit)
    : 1000;
}

export function passMatchesAltitudeRange(
  pass: AircraftPass,
  minAlt: number,
  maxAlt: number,
): boolean {
  return pass.trackPoints.some((pt) => {
    const alt = pt.alt;
    return typeof alt === 'number' && alt >= minAlt && alt <= maxAlt;
  });
}

export function buildDrawablePassIndex(passes: AircraftPass[]): AircraftPass[] {
  return passes
    .filter((pass) => pass.trackPoints.length >= 2)
    .slice()
    .sort((a, b) => {
      const endTimeOrder = b.endTime - a.endTime;
      if (endTimeOrder !== 0) return endTimeOrder;
      return a.passId < b.passId ? -1 : a.passId > b.passId ? 1 : 0;
    });
}

export function selectHistoryTrackMap(
  orderedPasses: AircraftPass[],
  limit: HistoryTrackLimit,
  selectedPassId: string | null,
): Map<string, TrackPoint[]> {
  const selectedPass = selectedPassId
    ? orderedPasses.find((pass) => pass.passId === selectedPassId)
    : undefined;
  const selected = limit === 'all' ? orderedPasses : orderedPasses.slice(0, limit);
  const tracks = new Map(selected.map((pass) => [pass.passId, pass.trackPoints]));

  if (selectedPass && !tracks.has(selectedPass.passId)) {
    tracks.set(selectedPass.passId, selectedPass.trackPoints);
  }

  return tracks;
}
