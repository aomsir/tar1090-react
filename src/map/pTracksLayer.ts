import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature, { type FeatureLike } from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import type { TrackPoint } from '@/features/track/track';
import { buildTrackSegments } from '@/features/track/track';
import type { HistoryTrackPaths } from '@/features/playback/historyTrackSelection';

type LegacyHistoryTrackPaths = Map<string, TrackPoint[]>;

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

function asTrackPaths(value: unknown, trackKey: string): readonly TrackPoint[][] {
  if (!Array.isArray(value) || value.length === 0) return [];
  if (value.every(isTrackPoint)) return [value];
  if (value.every(Array.isArray) && value.every((path) => path.every(isTrackPoint))) {
    return value as TrackPoint[][];
  }
  throw new TypeError(`Invalid history track paths for ${trackKey}: expected TrackPoint[] or TrackPoint[][]`);
}

export interface PTracksLayerHandle {
  layer: VectorLayer<VectorSource>;
  source: VectorSource;
  isFeatureVisible: (feature: FeatureLike) => boolean;
  setSelectedKey: (key: string | null) => void;
}

export function createPTracksLayer(): PTracksLayerHandle {
  let selectedKey: string | null = null;
  const source = new VectorSource();
  const isFeatureVisible = (feature: FeatureLike): boolean => {
    const trackKey = feature.get('trackKey');
    return typeof trackKey === 'string' && (selectedKey === null || trackKey === selectedKey);
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
  for (const [trackKey, value] of tracksMap) {
    const paths = asTrackPaths(value, trackKey);
    for (const points of paths) {
      const segments = buildTrackSegments(points, { gapThresholdSec });
      for (const seg of segments) {
        if (seg.coords.length < 2) continue;
        const feature = new Feature({
          geometry: new LineString(seg.coords.map(([lon, lat]) => fromLonLat([lon, lat]))),
        });
        feature.set('trackKey', trackKey);
        feature.set('colorKey', seg.colorKey);
        feature.set('estimated', seg.estimated);
        source.addFeature(feature);
      }
    }
  }
}
