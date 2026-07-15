import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature, { type FeatureLike } from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import type { TrackPoint } from '@/features/track/track';
import { iterateTrackSegments, trackSegmentContinues } from '@/features/track/track';
import type { HistoryTrackPaths } from '@/features/playback/historyTrackSelection';

type LegacyHistoryTrackPaths = Map<string, TrackPoint[]>;

const SYNC_REVISION = 'pTrackSyncRevision';

function isTrackPoint(value: unknown): value is TrackPoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<TrackPoint>;
  return (
    typeof point.lon === 'number' &&
    typeof point.lat === 'number' &&
    typeof point.ts === 'number' &&
    typeof point.ground === 'boolean'
  );
}

function* validatedTrackPoints(
  points: readonly unknown[],
  trackKey: string,
): Generator<TrackPoint> {
  for (const point of points) {
    if (!isTrackPoint(point)) {
      throw new TypeError(
        `Invalid history track paths for ${trackKey}: expected TrackPoint[] or TrackPoint[][]`,
      );
    }
    yield point;
  }
}

export interface PTracksLayerHandle {
  layer: VectorLayer<VectorSource>;
  source: VectorSource;
  isFeatureVisible: (feature: FeatureLike) => boolean;
  setSelectedKey: (key: string | null) => void;
}

export interface PTracksSyncJob {
  done: Promise<void>;
  cancel: () => void;
}

export interface PTracksSyncOptions {
  gapThresholdSec?: number;
  batchSize?: number;
  yieldToMain?: () => Promise<void>;
  onFirstBatch?: () => void;
  onComplete?: () => void;
}

interface DesiredPTrack {
  id: string;
  trackKey: string;
  colorKey: string;
  estimated: boolean;
  coordinates: readonly [number, number][];
  hasMorePotential: boolean;
}

function defaultYieldToMain(): Promise<void> {
  if (
    typeof document !== 'undefined' &&
    document.visibilityState !== 'hidden' &&
    typeof requestAnimationFrame === 'function'
  ) {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function* desiredPTracks(
  tracksMap: HistoryTrackPaths | LegacyHistoryTrackPaths,
  gapThresholdSec: number | undefined,
): Generator<DesiredPTrack> {
  const tracks = [...tracksMap];
  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex += 1) {
    const [trackKey, value] = tracks[trackIndex]!;
    const hasLaterTrack = trackIndex < tracks.length - 1;
    if (!Array.isArray(value) || value.length === 0) continue;
    const first = value[0];
    if (isTrackPoint(first)) {
      yield* desiredPathSegments(trackKey, 0, value, gapThresholdSec, hasLaterTrack);
      continue;
    }
    if (!Array.isArray(first)) {
      throw new TypeError(
        `Invalid history track paths for ${trackKey}: expected TrackPoint[] or TrackPoint[][]`,
      );
    }
    for (let pathIndex = 0; pathIndex < value.length; pathIndex += 1) {
      const points = value[pathIndex];
      if (!Array.isArray(points)) {
        throw new TypeError(
          `Invalid history track paths for ${trackKey}: expected TrackPoint[] or TrackPoint[][]`,
        );
      }
      yield* desiredPathSegments(
        trackKey,
        pathIndex,
        points,
        gapThresholdSec,
        pathIndex < value.length - 1 || hasLaterTrack,
      );
    }
  }
}

function* desiredPathSegments(
  trackKey: string,
  pathIndex: number,
  points: readonly unknown[],
  gapThresholdSec: number | undefined,
  hasLaterPath: boolean,
): Generator<DesiredPTrack> {
  let segmentIndex = 0;
  for (const segment of iterateTrackSegments(validatedTrackPoints(points, trackKey), {
    gapThresholdSec,
  })) {
    if (segment.coords.length >= 2) {
      yield {
        id: `${trackKey}:${pathIndex}:${segmentIndex}`,
        trackKey,
        colorKey: segment.colorKey,
        estimated: segment.estimated,
        coordinates: segment.coords,
        hasMorePotential: trackSegmentContinues(segment) || hasLaterPath,
      };
    }
    segmentIndex += 1;
  }
}

function updatePTrack(feature: Feature, desired: DesiredPTrack, revision?: number): void {
  feature.setGeometry(
    new LineString(desired.coordinates.map(([lon, lat]) => fromLonLat([lon, lat]))),
  );
  feature.set('trackKey', desired.trackKey);
  feature.set('colorKey', desired.colorKey);
  feature.set('estimated', desired.estimated);
  if (revision !== undefined) feature.set(SYNC_REVISION, revision);
}

function beginSyncRevision(source: VectorSource): number {
  const revision = ((source.get(SYNC_REVISION) as number | undefined) ?? 0) + 1;
  source.set(SYNC_REVISION, revision);
  source.changed();
  return revision;
}

export function createPTracksLayer(): PTracksLayerHandle {
  let selectedKey: string | null = null;
  const source = new VectorSource();
  const isFeatureVisible = (feature: FeatureLike): boolean => {
    const trackKey = feature.get('trackKey');
    const activeRevision = source.get(SYNC_REVISION) as number | undefined;
    return (
      typeof trackKey === 'string' &&
      (activeRevision === undefined || feature.get(SYNC_REVISION) === activeRevision) &&
      (selectedKey === null || trackKey === selectedKey)
    );
  };
  const layer = new VectorLayer({
    source,
    style: (feature) => {
      if (!isFeatureVisible(feature)) return new Style({});
      const color = feature.get('colorKey') as string;
      const estimated = feature.get('estimated') === true;
      return new Style({
        stroke: new Stroke({
          color,
          width: estimated ? 1 : 2,
          lineDash: estimated ? [4, 6] : undefined,
        }),
      });
    },
  });

  return {
    layer,
    source,
    isFeatureVisible,
    setSelectedKey(key: string | null) {
      selectedKey = key;
      layer.changed();
    },
  };
}

export function syncPTracks(
  source: VectorSource,
  tracksMap: HistoryTrackPaths | LegacyHistoryTrackPaths,
  gapThresholdSec?: number,
): void {
  source.clear();
  const revision = beginSyncRevision(source);
  for (const desired of desiredPTracks(tracksMap, gapThresholdSec)) {
    const feature = new Feature();
    feature.setId(desired.id);
    updatePTrack(feature, desired, revision);
    source.addFeature(feature);
  }
}

export function syncPTracksProgressive(
  source: VectorSource,
  tracksMap: HistoryTrackPaths | LegacyHistoryTrackPaths,
  options: PTracksSyncOptions = {},
): PTracksSyncJob {
  const batchSize =
    Number.isFinite(options.batchSize) && options.batchSize! > 0
      ? Math.floor(options.batchSize!)
      : 250;
  const descriptors = desiredPTracks(tracksMap, options.gapThresholdSec);
  const revision = beginSyncRevision(source);
  const seenIds = new Set<string>();
  let cancelled = false;
  let firstBatchDone = false;
  let exhausted = false;
  let hasMorePotential = false;
  const cancel = (): void => {
    cancelled = true;
  };
  const addBatch = (): void => {
    let count = 0;
    while (count < batchSize) {
      const next = descriptors.next();
      if (next.done) {
        exhausted = true;
        break;
      }
      const item = next.value;
      hasMorePotential = item.hasMorePotential;
      seenIds.add(item.id);
      const feature = source.getFeatureById(item.id);
      if (feature) updatePTrack(feature, item, revision);
      else {
        const next = new Feature();
        next.setId(item.id);
        updatePTrack(next, item, revision);
        source.addFeature(next);
      }
      count += 1;
    }
    if (!firstBatchDone) {
      firstBatchDone = true;
      options.onFirstBatch?.();
    }
    if (count > 0 && !hasMorePotential) exhausted = true;
  };

  let initialError: unknown;
  try {
    addBatch();
  } catch (error) {
    initialError = error;
  }
  const done = (async (): Promise<void> => {
    try {
      if (initialError) throw initialError;
      while (!cancelled && !exhausted) {
        await (options.yieldToMain ?? defaultYieldToMain)();
        if (cancelled) return;
        addBatch();
      }
      if (cancelled) return;
      for (const feature of source.getFeatures()) {
        if (!seenIds.has(String(feature.getId()))) {
          source.removeFeature(feature);
        }
      }
      options.onComplete?.();
    } catch (error) {
      if (source.get(SYNC_REVISION) === revision) {
        for (const feature of source.getFeatures()) {
          if (feature.get(SYNC_REVISION) === revision) source.removeFeature(feature);
        }
        source.changed();
      }
      throw error;
    }
  })();

  return { done, cancel };
}
