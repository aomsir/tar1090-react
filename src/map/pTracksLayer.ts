import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import type { TrackPoint } from '@/features/track/track';
import { buildTrackSegments } from '@/features/track/track';

export interface PTracksLayerHandle {
  layer: VectorLayer<VectorSource>;
  source: VectorSource;
  setSelectedHex: (hex: string | null) => void;
}

export function createPTracksLayer(): PTracksLayerHandle {
  let selectedHex: string | null = null;
  const source = new VectorSource();
  const layer = new VectorLayer({
    source,
    style: (feature) => {
      const hex = feature.get('hex') as string;
      if (selectedHex !== null && hex !== selectedHex) return new Style({});
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
    setSelectedHex(hex: string | null) {
      selectedHex = hex;
      layer.changed();
    },
  };
}

export function syncPTracks(source: VectorSource, tracksMap: Map<string, TrackPoint[]>): void {
  source.clear();
  for (const [hex, points] of tracksMap) {
    const segments = buildTrackSegments(points);
    for (const seg of segments) {
      if (seg.coords.length < 2) continue;
      const feature = new Feature({
        geometry: new LineString(seg.coords.map(([lon, lat]) => fromLonLat([lon, lat]))),
      });
      feature.set('hex', hex);
      feature.set('colorKey', seg.colorKey);
      feature.set('estimated', seg.estimated);
      source.addFeature(feature);
    }
  }
}
