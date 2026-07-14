import { describe, expect, it, vi } from 'vitest';
import Feature from 'ol/Feature';
import type { FeatureLike } from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import {
  closestHistoryTrackSelection,
  GAODE_BASEMAP_URL,
  isAircraftHitLayer,
  MAP_DIM_PERCENTAGE,
  MapController,
  resolveMapSelection,
  selectionFromAircraftFeature,
  type MapSelection,
} from '@/map/MapController';
import type { PTracksLayerHandle } from '@/map/pTracksLayer';
import type { TrackPoint } from '@/features/track/track';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('MapController basemap', () => {
  it('uses original Gaode tar1090 tile URL', () => {
    expect(GAODE_BASEMAP_URL).toBe(
      'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
    );
  });

  it('limits hit detection to the aircraft layer', () => {
    const aircraftLayer = { name: 'aircraft' };
    const pTracksLayer = { name: 'pTracks' };

    expect(isAircraftHitLayer(aircraftLayer, aircraftLayer)).toBe(true);
    expect(isAircraftHitLayer(pTracksLayer, aircraftLayer)).toBe(false);
  });
});

describe('MapController constants', () => {
  it('has a default dim percentage of 0.45', () => {
    expect(MAP_DIM_PERCENTAGE).toBe(0.45);
  });
});

describe('MapController selection helpers', () => {
  it('creates a typed aircraft selection from a string feature id', () => {
    const feature = new Feature();
    feature.setId('abc123');

    expect(selectionFromAircraftFeature(feature)).toEqual({
      type: 'aircraft',
      hex: 'abc123',
    } satisfies MapSelection);
  });

  it('rejects an aircraft feature without a string id', () => {
    expect(selectionFromAircraftFeature(new Feature())).toBeNull();

    const numericId = new Feature();
    numericId.setId(123);
    expect(selectionFromAircraftFeature(numericId)).toBeNull();
  });

  it('selects the history track geometrically nearest to the click coordinate', () => {
    const farther = new Feature({
      geometry: new LineString([
        [0, 3],
        [10, 3],
      ]),
    });
    farther.set('trackKey', 'farther-pass');
    const nearer = new Feature({
      geometry: new LineString([
        [0, 1],
        [10, 1],
      ]),
    });
    nearer.set('trackKey', 'nearer-pass');

    expect(closestHistoryTrackSelection([farther, nearer], [5, 0])).toEqual({
      type: 'historyTrack',
      passId: 'nearer-pass',
    } satisfies MapSelection);
  });

  it('ignores history track features without a string track key or valid geometry', () => {
    const missingKey = new Feature({
      geometry: new LineString([
        [0, 1],
        [10, 1],
      ]),
    });
    const missingGeometry = new Feature();
    missingGeometry.set('trackKey', 'pass-a');
    const unsupportedGeometry = {
      get: (key: string) => (key === 'trackKey' ? 'pass-b' : undefined),
      getGeometry: () => ({}),
    } as unknown as FeatureLike;

    expect(
      closestHistoryTrackSelection([missingKey, missingGeometry, unsupportedGeometry], [5, 0]),
    ).toBeNull();
  });

  it('prefers an aircraft hit over history-track candidates', () => {
    const aircraft = new Feature();
    aircraft.setId('abc123');
    const track = new Feature({
      geometry: new LineString([
        [0, 0],
        [10, 0],
      ]),
    });
    track.set('trackKey', 'pass-a');

    expect(resolveMapSelection(aircraft, [track], [5, 0])).toEqual({
      type: 'aircraft',
      hex: 'abc123',
    } satisfies MapSelection);
  });

  it('returns null when neither an aircraft nor a history track is hit', () => {
    expect(resolveMapSelection(undefined, [], [5, 0])).toBeNull();
  });
});

describe('MapController controls', () => {
  it('cancels an earlier progressive pTracks job before starting the next one', async () => {
    const controller = new MapController(document.createElement('div'));
    const source = (controller as unknown as { pTracksHandle: PTracksLayerHandle }).pTracksHandle
      .source;
    const points = (lon: number): TrackPoint[] => [
      { lon, lat: 30, alt: 10_000, ts: 1_000, ground: false },
      { lon: lon + 0.1, lat: 30.1, alt: 11_000, ts: 1_010, ground: false },
    ];
    let release: (() => void) | undefined;

    const first = controller.showPTracks(
      new Map([
        ['first', points(110)],
        ['old-later', points(111)],
      ]),
      { batchSize: 1, yieldToMain: () => new Promise<void>((resolve) => (release = resolve)) },
    );
    expect(source.getFeatures().map((feature) => feature.get('trackKey'))).toEqual(['first']);
    const second = controller.showPTracks(new Map([['replacement', points(120)]]));

    release?.();
    await Promise.all([first, second]);

    expect(source.getFeatures().map((feature) => feature.get('trackKey'))).toEqual(['replacement']);
    controller.dispose();
  });

  it('cancels a pending pTracks job before clearing the source', async () => {
    const controller = new MapController(document.createElement('div'));
    const source = (controller as unknown as { pTracksHandle: PTracksLayerHandle }).pTracksHandle
      .source;
    let release: (() => void) | undefined;

    const done = controller.showPTracks(
      new Map([
        [
          'first',
          [
            { lon: 110, lat: 30, alt: 10_000, ts: 1_000, ground: false },
            { lon: 110.1, lat: 30.1, alt: 11_000, ts: 1_010, ground: false },
          ],
        ],
        [
          'later',
          [
            { lon: 111, lat: 31, alt: 5_000, ts: 1_000, ground: false },
            { lon: 111.1, lat: 31.1, alt: 6_000, ts: 1_010, ground: false },
          ],
        ],
      ]),
      { batchSize: 1, yieldToMain: () => new Promise<void>((resolve) => (release = resolve)) },
    );

    controller.clearPTracks();
    release?.();
    await done;

    expect(source.getFeatures()).toHaveLength(0);
    controller.dispose();
  });

  it('creates the map without any default controls', () => {
    const el = document.createElement('div');
    const controller = new MapController(el);
    const map = (controller as unknown as { map: { getControls(): { getLength(): number } } }).map;
    expect(map.getControls().getLength()).toBe(0);
    controller.dispose();
  });

  it('keeps marker selection separate from pass track selection', () => {
    const controller = new MapController(document.createElement('div'));
    const pTracksHandle = (controller as unknown as { pTracksHandle: PTracksLayerHandle })
      .pTracksHandle;
    const setSelectedTrackKey = vi.spyOn(pTracksHandle, 'setSelectedKey');

    controller.setSelected('abc123');
    expect(setSelectedTrackKey).not.toHaveBeenCalled();

    controller.setSelectedTrackKey('abc123:1000');
    expect(setSelectedTrackKey).toHaveBeenCalledWith('abc123:1000');
    controller.dispose();
  });

  it('does not query persistent tracks or select them by default after an aircraft miss', () => {
    const controller = new MapController(document.createElement('div'));
    const map = (
      controller as unknown as {
        map: {
          dispatchEvent(event: { type: string; pixel: number[]; coordinate: number[] }): void;
          forEachFeatureAtPixel: ReturnType<typeof vi.fn>;
        };
      }
    ).map;
    const onSelect = vi.fn();
    controller.onSelect(onSelect);

    vi.spyOn(map, 'forEachFeatureAtPixel').mockReturnValue(undefined);

    map.dispatchEvent({ type: 'click', pixel: [5, 0], coordinate: [5, 0] });

    expect(map.forEachFeatureAtPixel).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(null);
    controller.dispose();
  });

  it('clicks the nearest visible history track after aircraft hit detection misses', () => {
    const controller = new MapController(document.createElement('div'));
    const map = (
      controller as unknown as {
        map: {
          dispatchEvent(event: { type: string; pixel: number[]; coordinate: number[] }): void;
          forEachFeatureAtPixel: ReturnType<typeof vi.fn>;
        };
        pTracksHandle: PTracksLayerHandle;
      }
    ).map;
    const pTracksHandle = (controller as unknown as { pTracksHandle: PTracksLayerHandle })
      .pTracksHandle;
    const visible = new Feature({
      geometry: new LineString([
        [0, 1],
        [10, 1],
      ]),
    });
    visible.set('trackKey', 'visible-pass');
    const hidden = new Feature({
      geometry: new LineString([
        [0, 0],
        [10, 0],
      ]),
    });
    hidden.set('trackKey', 'hidden-pass');
    pTracksHandle.setSelectedKey('visible-pass');
    const onSelect = vi.fn();
    controller.onSelect(onSelect);
    (
      controller as unknown as { setHistoryTrackSelectionEnabled(enabled: boolean): void }
    ).setHistoryTrackSelectionEnabled(true);

    vi.spyOn(map, 'forEachFeatureAtPixel').mockImplementation((_, callback, options) => {
      if (options?.hitTolerance === 5) return undefined;
      expect(options?.hitTolerance).toBe(8);
      expect(options?.layerFilter?.(pTracksHandle.layer)).toBe(true);
      expect(callback(visible, pTracksHandle.layer)).toBeUndefined();
      expect(callback(hidden, pTracksHandle.layer)).toBeUndefined();
      return undefined;
    });

    map.dispatchEvent({ type: 'click', pixel: [5, 0], coordinate: [5, 0] });

    expect(onSelect).toHaveBeenCalledWith({ type: 'historyTrack', passId: 'visible-pass' });
    controller.dispose();
  });

  it('prefers an aircraft click over persistent-track candidates', () => {
    const controller = new MapController(document.createElement('div'));
    const map = (
      controller as unknown as {
        map: {
          dispatchEvent(event: { type: string; pixel: number[]; coordinate: number[] }): void;
          forEachFeatureAtPixel: ReturnType<typeof vi.fn>;
        };
        handle: { layer: unknown };
        pTracksHandle: PTracksLayerHandle;
      }
    ).map;
    const aircraft = new Feature();
    aircraft.setId('abc123');
    const track = new Feature({
      geometry: new LineString([
        [0, 0],
        [10, 0],
      ]),
    });
    track.set('trackKey', 'pass-a');
    const onSelect = vi.fn();
    controller.onSelect(onSelect);

    vi.spyOn(map, 'forEachFeatureAtPixel').mockImplementation((_, callback, options) => {
      if (options?.hitTolerance === 5) {
        expect(options?.layerFilter?.((controller as never).handle.layer)).toBe(true);
        return callback(aircraft, {} as never);
      }
      callback(track, {} as never);
      return undefined;
    });

    map.dispatchEvent({ type: 'click', pixel: [5, 0], coordinate: [5, 0] });

    expect(onSelect).toHaveBeenCalledWith({ type: 'aircraft', hex: 'abc123' });
    expect(map.forEachFeatureAtPixel).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('shows a pointer only for aircraft or visible history-track hover hits', () => {
    const target = document.createElement('div');
    const controller = new MapController(target);
    const map = (
      controller as unknown as {
        map: {
          dispatchEvent(event: {
            type: string;
            pixel: number[];
            coordinate: number[];
            dragging: boolean;
          }): void;
          forEachFeatureAtPixel: ReturnType<typeof vi.fn>;
        };
        pTracksHandle: PTracksLayerHandle;
      }
    ).map;
    const pTracksHandle = (controller as unknown as { pTracksHandle: PTracksLayerHandle })
      .pTracksHandle;
    const visible = new Feature({
      geometry: new LineString([
        [0, 0],
        [10, 0],
      ]),
    });
    visible.set('trackKey', 'visible-pass');
    const hidden = new Feature({
      geometry: new LineString([
        [0, 0],
        [10, 0],
      ]),
    });
    hidden.set('trackKey', 'hidden-pass');
    pTracksHandle.setSelectedKey('visible-pass');
    (
      controller as unknown as { setHistoryTrackSelectionEnabled(enabled: boolean): void }
    ).setHistoryTrackSelectionEnabled(true);

    vi.spyOn(map, 'forEachFeatureAtPixel').mockImplementation((_, callback, options) => {
      if (options?.hitTolerance === 5) return undefined;
      callback(hidden, pTracksHandle.layer);
      return undefined;
    });
    map.dispatchEvent({ type: 'pointermove', pixel: [5, 0], coordinate: [5, 0], dragging: false });
    expect(target.style.cursor).toBe('');

    vi.spyOn(map, 'forEachFeatureAtPixel').mockImplementation((_, callback, options) => {
      if (options?.hitTolerance === 5) return undefined;
      return callback(visible, pTracksHandle.layer);
    });
    map.dispatchEvent({ type: 'pointermove', pixel: [5, 0], coordinate: [5, 0], dragging: false });

    expect(target.style.cursor).toBe('pointer');
    controller.dispose();
  });

  it('does not query persistent tracks or show a pointer by default after an aircraft hover miss', () => {
    const target = document.createElement('div');
    const controller = new MapController(target);
    const map = (
      controller as unknown as {
        map: {
          dispatchEvent(event: {
            type: string;
            pixel: number[];
            coordinate: number[];
            dragging: boolean;
          }): void;
          forEachFeatureAtPixel: ReturnType<typeof vi.fn>;
        };
      }
    ).map;

    vi.spyOn(map, 'forEachFeatureAtPixel').mockReturnValue(undefined);

    map.dispatchEvent({ type: 'pointermove', pixel: [5, 0], coordinate: [5, 0], dragging: false });

    expect(map.forEachFeatureAtPixel).toHaveBeenCalledTimes(1);
    expect(target.style.cursor).toBe('');
    controller.dispose();
  });
});
