import { describe, it, expect } from 'vitest';
import VectorSource from 'ol/source/Vector';
import LineString from 'ol/geom/LineString';
import { createTrackLayer, syncTrack } from '@/map/trackLayer';
import type { TrackSegment } from '@/features/track/track';

const seg = (over: Partial<TrackSegment>): TrackSegment => ({
  coords: [
    [0, 0],
    [1, 1],
  ],
  colorKey: 'hsl(140, 88%, 41%)',
  ground: false,
  estimated: false,
  ...over,
});

describe('trackLayer', () => {
  it('creates a vector layer with a source', () => {
    const handle = createTrackLayer();
    expect(handle.source).toBeInstanceOf(VectorSource);
  });

  it('syncTrack adds one LineString feature per renderable segment and skips <2-coord segments', () => {
    const source = new VectorSource();
    syncTrack(source, [seg({}), seg({ coords: [[5, 5]] })]);
    const features = source.getFeatures();
    expect(features).toHaveLength(1);
    expect(features[0].getGeometry()).toBeInstanceOf(LineString);
    expect(features[0].get('estimated')).toBe(false);
    expect(features[0].get('colorKey')).toBe(seg({}).colorKey);
  });

  it('syncTrack clears previous features on each call', () => {
    const source = new VectorSource();
    syncTrack(source, [seg({})]);
    syncTrack(source, [
      seg({}),
      seg({
        coords: [
          [2, 2],
          [3, 3],
        ],
      }),
    ]);
    expect(source.getFeatures()).toHaveLength(2);
  });

  it('projects coordinates from lon/lat to EPSG:3857', () => {
    const source = new VectorSource();
    syncTrack(source, [
      seg({
        coords: [
          [180, 0],
          [179, 0],
        ],
      }),
    ]);
    const geom = source.getFeatures()[0].getGeometry() as LineString;
    const coords = geom.getCoordinates();
    expect(coords[0][0]).not.toBe(180);
    expect(coords[0][0]).toBeGreaterThan(2e7);
  });

  it('stores label on feature when segment has label', () => {
    const source = new VectorSource();
    syncTrack(source, [seg({ label: '32000 ft' })]);
    expect(source.getFeatures()[0].get('label')).toBe('32000 ft');
  });

  it('renders no text when trackLabels is false', () => {
    const handle = createTrackLayer();
    handle.labelConfig = { enabled: true, extended: 0, trackLabels: false };
    const source = handle.source;
    syncTrack(source, [seg({ label: '32000 ft' })]);
    const feature = source.getFeatures()[0];
    const styleFn = handle.layer.getStyleFunction()!;
    const style = styleFn(feature, 1);
    const styles = Array.isArray(style) ? style : [style];
    const textVal = styles[0]?.getText?.()?.getText?.();
    expect(textVal == null || textVal === '').toBe(true);
  });

  it('renders segment label when trackLabels is true', () => {
    const handle = createTrackLayer();
    handle.labelConfig = { enabled: true, extended: 0, trackLabels: true };
    const source = handle.source;
    syncTrack(source, [seg({ label: '32000 ft' })]);
    const feature = source.getFeatures()[0];
    const styleFn = handle.layer.getStyleFunction()!;
    const style = styleFn(feature, 1);
    const styles = Array.isArray(style) ? style : [style];
    expect(styles[0]?.getText?.()?.getText?.()).toBe('32000 ft');
  });
});
