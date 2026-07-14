import type { TrackPoint } from '@/features/track/track';
import {
  altitudeSummaryIntersects,
  clipTrackToAltitudeRange,
  type AltitudeRange,
} from './altitudeTracks';
import type { AircraftPass } from './aircraftPasses';
import type { HistoryTrackLimit } from './historyTracks';

export type HistoryTrackPaths = Map<string, readonly TrackPoint[][]>;

function cacheKey(passId: string, range: AltitudeRange): string {
  return `${passId}:${range.min}:${range.max}`;
}

function freezePaths(paths: TrackPoint[][]): readonly TrackPoint[][] {
  if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    for (const path of paths) Object.freeze(path);
    Object.freeze(paths);
  }
  return paths;
}

export class HistoryTrackClipCache {
  private generation = -1;
  private readonly values = new Map<string, readonly TrackPoint[][]>();

  setGeneration(generation: number): void {
    if (generation === this.generation) return;
    this.generation = generation;
    this.values.clear();
  }

  get size(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  get(passId: string, range: AltitudeRange): readonly TrackPoint[][] | undefined {
    return this.values.get(cacheKey(passId, range));
  }

  set(passId: string, range: AltitudeRange, paths: TrackPoint[][]): readonly TrackPoint[][] {
    const immutablePaths = freezePaths(paths);
    this.values.set(cacheKey(passId, range), immutablePaths);
    return immutablePaths;
  }
}

export interface HistoryTrackSelectionOptions {
  generation?: number;
  altitudeRange?: AltitudeRange;
  cache?: HistoryTrackClipCache;
  clipTrack?: (points: readonly TrackPoint[], range: AltitudeRange) => TrackPoint[][];
}

export function selectHistoryTrackPaths(
  orderedPasses: readonly AircraftPass[],
  limit: HistoryTrackLimit,
  selectedPassId: string | null,
  options: HistoryTrackSelectionOptions = {},
): HistoryTrackPaths {
  const tracks: HistoryTrackPaths = new Map();
  const { altitudeRange, cache } = options;
  const clipTrack = options.clipTrack ?? clipTrackToAltitudeRange;
  let selectedCountsTowardLimit = false;
  cache?.setGeneration(options.generation ?? 0);

  for (const pass of orderedPasses) {
    if (limit !== 'all' && tracks.size + Number(selectedCountsTowardLimit) >= limit) break;

    if (pass.passId === selectedPassId) {
      selectedCountsTowardLimit = !altitudeRange || altitudeSummaryIntersects(pass.altitudeSummary, altitudeRange);
      continue;
    }

    if (!altitudeRange) {
      tracks.set(pass.passId, [pass.trackPoints]);
      continue;
    }

    if (!altitudeSummaryIntersects(pass.altitudeSummary, altitudeRange)) continue;
    let paths = cache?.get(pass.passId, altitudeRange);
    if (!paths) {
      const clipped = clipTrack(pass.trackPoints, altitudeRange);
      paths = cache?.set(pass.passId, altitudeRange, clipped) ?? clipped;
    }
    if (paths.length > 0) tracks.set(pass.passId, paths);
  }

  if (selectedPassId) {
    const selectedPass = orderedPasses.find((pass) => pass.passId === selectedPassId);
    if (selectedPass) tracks.set(selectedPass.passId, [selectedPass.trackPoints]);
  }

  return tracks;
}
