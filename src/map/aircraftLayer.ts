import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import type { Aircraft } from '@/domain/Aircraft';
import { aircraftStyle } from './style';

export interface AircraftLayerHandle {
  layer: VectorLayer<VectorSource>;
  source: VectorSource;
}

export function createAircraftLayer(): AircraftLayerHandle {
  const source = new VectorSource();
  const layer = new VectorLayer({
    source,
    style: (feature) =>
      aircraftStyle(feature.get('aircraft') as Aircraft, feature.get('selected') === true),
  });
  return { layer, source };
}

export function syncFeatures(
  source: VectorSource,
  list: Aircraft[],
  selectedHex: string | null,
): void {
  const present = new Set<string>();
  for (const ac of list) {
    if (!ac.hasPosition()) continue;
    present.add(ac.hex);
    const coord = fromLonLat([ac.lon as number, ac.lat as number]);
    let feature = source.getFeatureById(ac.hex);
    if (!feature) {
      feature = new Feature({ geometry: new Point(coord) });
      feature.setId(ac.hex);
      source.addFeature(feature);
    } else {
      (feature.getGeometry() as Point).setCoordinates(coord);
    }
    feature.set('aircraft', ac);
    feature.set('selected', ac.hex === selectedHex);
  }
  for (const feature of source.getFeatures()) {
    if (!present.has(feature.getId() as string)) {
      source.removeFeature(feature);
    }
  }
}
