import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import { getBottomLeft, getTopRight } from 'ol/extent';
import { defaults as defaultControls } from 'ol/control/defaults';
import type { FeatureLike } from 'ol/Feature';
import { createAircraftLayer, syncFeatures, type AircraftLayerHandle } from './aircraftLayer';
import { createTrackLayer, syncTrack, type TrackLayerHandle } from './trackLayer';
import type { Aircraft } from '@/domain/Aircraft';
import type { TrackSegment } from '@/features/track/track';

export const GAODE_BASEMAP_URL =
  'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';

export class MapController {
  private readonly map: Map;
  private readonly handle: AircraftLayerHandle;
  private readonly trackHandle: TrackLayerHandle;
  private selectedHex: string | null = null;
  private selectCb: ((hex: string | null) => void) | null = null;

  constructor(target: HTMLElement) {
    this.handle = createAircraftLayer();
    this.trackHandle = createTrackLayer();
    this.map = new Map({
      target,
      controls: defaultControls({ rotate: false, attribution: false }),
      layers: [
        new TileLayer({
          source: new XYZ({ url: GAODE_BASEMAP_URL, crossOrigin: 'anonymous', maxZoom: 19 }),
        }),
        this.trackHandle.layer,
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
    const zoom = this.map.getView().getZoom() ?? 0;
    syncFeatures(this.handle.source, list, this.selectedHex, zoom);
  }

  showTrack(segments: TrackSegment[]): void {
    syncTrack(this.trackHandle.source, segments);
  }

  clearTrack(): void {
    this.trackHandle.source.clear();
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
