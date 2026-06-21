import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import Text from 'ol/style/Text';
import type { TrackSegment } from '@/features/track/track';

export interface TrackLayerHandle {
  layer: VectorLayer<VectorSource>;
  source: VectorSource;
  labelConfig?: import('./aircraftLayer').LabelConfig;
}

export function createTrackLayer(): TrackLayerHandle {
  const source = new VectorSource();
  const handle: TrackLayerHandle = { layer: null as unknown as VectorLayer<VectorSource>, source };
  const layer = new VectorLayer({
    source,
    style: (feature) => {
      const color = feature.get('colorKey') as string;
      const estimated = feature.get('estimated') === true;
      const label = feature.get('label') as string | undefined;
      const showLabel = handle.labelConfig?.trackLabels === true && label;
      return new Style({
        stroke: new Stroke({
          color,
          width: estimated ? 1.5 : 2.5,
          lineDash: estimated ? [4, 6] : undefined,
        }),
        ...(showLabel && {
          text: new Text({
            text: label,
            font: 'bold 11px/13px Tahoma, Geneva, sans-serif',
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: 'rgba(0,0,0,0.75)', width: 3 }),
            placement: 'line',
          }),
        }),
      });
    },
  });
  handle.layer = layer;
  return handle;
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
    if (seg.label) feature.set('label', seg.label);
    source.addFeature(feature);
  }
}
