import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature, { type FeatureLike } from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import type { TrackPoint } from '@/features/track/track';
import { buildTrackSegments } from '@/features/track/track';

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
  tracksMap: Map<string, TrackPoint[]>,
  gapThresholdSec?: number,
): void {
  source.clear();
  for (const [trackKey, points] of tracksMap) {
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
