import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import type { TrackSegment } from '@/features/track/track';

export interface TrackLayerHandle {
  layer: VectorLayer<VectorSource>;
  source: VectorSource;
}

export function createTrackLayer(): TrackLayerHandle {
  const source = new VectorSource();
  const layer = new VectorLayer({
    source,
    style: (feature) => {
      const color = feature.get('colorKey') as string;
      const estimated = feature.get('estimated') === true;
      return new Style({
        stroke: new Stroke({
          color,
          width: estimated ? 1.5 : 2.5,
          lineDash: estimated ? [4, 6] : undefined,
        }),
      });
    },
  });
  return { layer, source };
}

export function syncTrack(source: VectorSource, segments: TrackSegment[]): void {
  source.clear();
  for (const seg of segments) {
    if (seg.coords.length < 2) continue;
    const feature = new Feature({
      geometry: new LineString(seg.coords.map(([lon, lat]) => fromLonLat([lon, lat]))),
    });
    feature.set('colorKey', seg.colorKey);
    feature.set('estimated', seg.estimated);
    source.addFeature(feature);
  }
}
