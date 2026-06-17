import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import { getBottomLeft, getTopRight } from 'ol/extent';
import { defaults as defaultControls } from 'ol/control/defaults';
import type { FeatureLike } from 'ol/Feature';
import { createAircraftLayer, syncFeatures, type AircraftLayerHandle } from './aircraftLayer';
import type { Aircraft } from '@/domain/Aircraft';

const DARK_BASEMAP = 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

export class MapController {
  private readonly map: Map;
  private readonly handle: AircraftLayerHandle;
  private selectedHex: string | null = null;
  private selectCb: ((hex: string | null) => void) | null = null;

  constructor(target: HTMLElement) {
    this.handle = createAircraftLayer();
    this.map = new Map({
      target,
      controls: defaultControls({ rotate: false, attribution: false }),
      layers: [
        new TileLayer({ source: new XYZ({ url: DARK_BASEMAP, crossOrigin: 'anonymous' }) }),
        this.handle.layer,
      ],
      view: new View({ center: fromLonLat([110, 30]), zoom: 6 }),
    });

    this.map.on('click', (evt) => {
      const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f: FeatureLike) => f, {
        hitTolerance: 5,
      });
      const hex = feature ? ((feature.getId() as string | undefined) ?? null) : null;
      this.selectCb?.(hex);
    });

    this.map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      const hit = this.map.hasFeatureAtPixel(evt.pixel, { hitTolerance: 5 });
      const el = this.map.getTargetElement();
      if (el) el.style.cursor = hit ? 'pointer' : '';
    });
  }

  syncAircraft(list: Aircraft[]): void {
    syncFeatures(this.handle.source, list, this.selectedHex);
  }

  centerOn(lon: number, lat: number, zoom?: number): void {
    const view = this.map.getView();
    view.animate({
      center: fromLonLat([lon, lat]),
      zoom: zoom ?? Math.max(view.getZoom() ?? 6, 9),
      duration: 350,
    });
  }

  getViewExtentLonLat(): [number, number, number, number] | null {
    const size = this.map.getSize();
    if (!size) return null;
    const extent = this.map.getView().calculateExtent(size);
    const [minLon, minLat] = toLonLat(getBottomLeft(extent));
    const [maxLon, maxLat] = toLonLat(getTopRight(extent));
    return [minLon, minLat, maxLon, maxLat];
  }

  onViewChange(cb: () => void): void {
    this.map.on('moveend', cb);
  }

  setSelected(hex: string | null): void {
    this.selectedHex = hex;
    for (const feature of this.handle.source.getFeatures()) {
      feature.set('selected', feature.getId() === hex);
    }
    this.handle.layer.changed();
  }

  onSelect(cb: (hex: string | null) => void): void {
    this.selectCb = cb;
  }

  dispose(): void {
    this.map.setTarget();
  }
}
