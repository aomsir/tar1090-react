import { describe, it, expect } from 'vitest';
import { createAircraftLayer, syncFeatures } from './aircraftLayer';
import { Aircraft } from '@/domain/Aircraft';

function ac(hex: string, lat: number, lon: number): Aircraft {
  const a = new Aircraft(hex);
  a.update({ hex, lat, lon, altitude: 1000, track: 90 }, 1);
  return a;
}

describe('aircraftLayer', () => {
  it('adds one feature per positioned aircraft, keyed by hex', () => {
    const { source } = createAircraftLayer();
    syncFeatures(source, [ac('a', 10, 20), ac('b', 11, 21)], null);
    expect(source.getFeatures()).toHaveLength(2);
    expect(source.getFeatureById('a')).not.toBeNull();
  });

  it('skips aircraft without a position', () => {
    const { source } = createAircraftLayer();
    const noPos = new Aircraft('c');
    noPos.update({ hex: 'c', altitude: 1000 }, 1);
    syncFeatures(source, [noPos], null);
    expect(source.getFeatures()).toHaveLength(0);
  });

  it('moves an existing feature instead of recreating it', () => {
    const { source } = createAircraftLayer();
    syncFeatures(source, [ac('a', 10, 20)], null);
    const before = source.getFeatureById('a');
    syncFeatures(source, [ac('a', 12, 22)], null);
    const after = source.getFeatureById('a');
    expect(after).toBe(before); // same feature object, moved
    expect(source.getFeatures()).toHaveLength(1);
  });

  it('removes features whose aircraft is no longer present', () => {
    const { source } = createAircraftLayer();
    syncFeatures(source, [ac('a', 10, 20), ac('b', 11, 21)], null);
    syncFeatures(source, [ac('a', 10, 20)], null);
    expect(source.getFeatureById('b')).toBeNull();
    expect(source.getFeatures()).toHaveLength(1);
  });

  it('marks the selected feature via the "selected" property', () => {
    const { source } = createAircraftLayer();
    syncFeatures(source, [ac('a', 10, 20), ac('b', 11, 21)], 'b');
    expect(source.getFeatureById('a')!.get('selected')).toBe(false);
    expect(source.getFeatureById('b')!.get('selected')).toBe(true);
  });
});
