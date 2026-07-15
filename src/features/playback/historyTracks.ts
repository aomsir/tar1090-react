import type { AircraftPass } from './aircraftPasses';

export const HISTORY_TRACK_LIMITS = [100, 500, 1000, 2000, 5000, 'all'] as const;

export type HistoryTrackLimit = (typeof HISTORY_TRACK_LIMITS)[number];

export function normalizeHistoryTrackLimit(value: unknown): HistoryTrackLimit {
  return HISTORY_TRACK_LIMITS.includes(value as HistoryTrackLimit)
    ? (value as HistoryTrackLimit)
    : 1000;
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
