import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import { getBottomLeft, getTopRight } from 'ol/extent';
import type { FeatureLike } from 'ol/Feature';
import type RenderEvent from 'ol/render/Event';
import {
  createAircraftLayer,
  setFeatureZoom,
  syncFeatures,
  type AircraftLayerHandle,
} from './aircraftLayer';
import { createTrackLayer, syncTrack, type TrackLayerHandle } from './trackLayer';
import { createPTracksLayer, syncPTracks, type PTracksLayerHandle } from './pTracksLayer';
import type { Aircraft } from '@/domain/Aircraft';
import type { TrackSegment } from '@/features/track/track';
import type { TrackPoint } from '@/features/track/track';

export const GAODE_BASEMAP_URL =
  'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';

/** Default map dimming strength, matching tar1090's multiply blend behavior. */
export const MAP_DIM_PERCENTAGE = 0.45;

export function isAircraftHitLayer(layer: unknown, aircraftLayer: unknown): boolean {
  return layer === aircraftLayer;
}

/** Dims tile renders with a Canvas postrender pass. */
function dimTiles(evt: RenderEvent): void {
  const ctx = evt.context as CanvasRenderingContext2D | null;
  if (!ctx) return;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(0,0,0,${MAP_DIM_PERCENTAGE})`;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = 'source-over';
}

export class MapController {
  private readonly map: Map;
  private readonly tileLayer: TileLayer<XYZ>;
  private readonly handle: AircraftLayerHandle;
  private readonly trackHandle: TrackLayerHandle;
  private readonly pTracksHandle: PTracksLayerHandle;
  private selectedHex: string | null = null;
  private selectCb: ((hex: string | null) => void) | null = null;
  private followEnabled = false;
  private dimEnabled = true;

  constructor(target: HTMLElement) {
    this.handle = createAircraftLayer();
    this.trackHandle = createTrackLayer();
    this.pTracksHandle = createPTracksLayer();
    this.tileLayer = new TileLayer({
      source: new XYZ({ url: GAODE_BASEMAP_URL, crossOrigin: 'anonymous', maxZoom: 19 }),
    });
    this.tileLayer.on('postrender', dimTiles);
    this.map = new Map({
      target,
      controls: [],
      layers: [this.tileLayer, this.pTracksHandle.layer, this.trackHandle.layer, this.handle.layer],
      view: new View({ center: fromLonLat([110, 30]), zoom: 6 }),
    });

    this.map.on('click', (evt) => {
      const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f: FeatureLike) => f, {
        hitTolerance: 5,
        layerFilter: (layer) => isAircraftHitLayer(layer, this.handle.layer),
      });
      const hex = feature ? ((feature.getId() as string | undefined) ?? null) : null;
      this.selectCb?.(hex);
    });

    this.map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      const hit = this.map.hasFeatureAtPixel(evt.pixel, {
        hitTolerance: 5,
        layerFilter: (layer) => isAircraftHitLayer(layer, this.handle.layer),
      });
      const el = this.map.getTargetElement();
      if (el) el.style.cursor = hit ? 'pointer' : '';
    });

    this.map.on('moveend', () => {
      const zoom = this.map.getView().getZoom() ?? 0;
      setFeatureZoom(this.handle.source, zoom);
      this.handle.layer.changed();
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

  showPTracks(tracksMap: globalThis.Map<string, TrackPoint[]>, gapThresholdSec?: number): void {
    syncPTracks(this.pTracksHandle.source, tracksMap, gapThresholdSec);
  }

  clearPTracks(): void {
    this.pTracksHandle.source.clear();
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

  setSelectedTrackKey(key: string | null): void {
    this.pTracksHandle.setSelectedKey(key);
  }

  onSelect(cb: (hex: string | null) => void): void {
    this.selectCb = cb;
  }

  resetView(): void {
    this.map.getView().animate({
      center: fromLonLat([110, 30]),
      zoom: 6,
      duration: 350,
    });
  }

  setDim(enabled: boolean): void {
    if (enabled === this.dimEnabled) return;
    this.dimEnabled = enabled;
    if (enabled) {
      this.tileLayer.on('postrender', dimTiles);
    } else {
      this.tileLayer.un('postrender', dimTiles);
    }
    this.tileLayer.changed();
  }

  setFollow(enabled: boolean): void {
    this.followEnabled = enabled;
  }

  isFollowing(): boolean {
    return this.followEnabled;
  }

  requestFullscreen(): void {
    this.map.getTargetElement()?.ownerDocument?.documentElement?.requestFullscreen?.();
  }

  exitFullscreen(): void {
    document.exitFullscreen?.();
  }

  setLabelConfig(config: { enabled: boolean; extended: number; trackLabels: boolean }): void {
    this.handle.labelConfig = config;
    this.handle.layer.changed();
    this.trackHandle.labelConfig = config;
    this.trackHandle.layer.changed();
  }

  dispose(): void {
    this.map.setTarget();
  }
}
