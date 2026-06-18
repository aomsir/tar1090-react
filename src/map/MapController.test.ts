import { describe, expect, it } from 'vitest';
import { GAODE_BASEMAP_URL, isAircraftHitLayer } from './MapController';

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
