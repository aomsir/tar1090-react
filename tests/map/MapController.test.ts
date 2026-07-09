import { describe, expect, it, vi } from 'vitest';
import {
  GAODE_BASEMAP_URL,
  isAircraftHitLayer,
  MAP_DIM_PERCENTAGE,
  MapController,
} from '@/map/MapController';
import type { PTracksLayerHandle } from '@/map/pTracksLayer';

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

describe('MapController controls', () => {
  it('creates the map without any default controls', () => {
    const el = document.createElement('div');
    const controller = new MapController(el);
    const map = (controller as unknown as { map: { getControls(): { getLength(): number } } }).map;
    expect(map.getControls().getLength()).toBe(0);
    controller.dispose();
  });

  it('keeps marker selection separate from pass track selection', () => {
    const controller = new MapController(document.createElement('div'));
    const pTracksHandle = (controller as unknown as { pTracksHandle: PTracksLayerHandle }).pTracksHandle;
    const setSelectedTrackKey = vi.spyOn(pTracksHandle, 'setSelectedKey');

    controller.setSelected('abc123');
    expect(setSelectedTrackKey).not.toHaveBeenCalled();

    controller.setSelectedTrackKey('abc123:1000');
    expect(setSelectedTrackKey).toHaveBeenCalledWith('abc123:1000');
    controller.dispose();
  });
});
