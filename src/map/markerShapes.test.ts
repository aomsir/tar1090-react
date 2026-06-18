import { describe, it, expect } from 'vitest';
import { getBaseMarker, svgShapeToDataUri, selectMarker } from './markerShapes';
import { shapes } from './markerShapes.data';
import { Aircraft } from '@/domain/Aircraft';

describe('getBaseMarker', () => {
  it('resolves by ICAO type designator', () => {
    expect(getBaseMarker(undefined, 'A320', undefined, undefined, undefined, 30000)).toEqual([
      'airliner',
      0.94,
    ]);
  });

  it('falls back to ADS-B category when type is unknown', () => {
    expect(getBaseMarker('A5', 'ZZZZ', undefined, undefined, undefined, 30000)).toEqual([
      'heavy_2e',
      0.92,
    ]);
  });

  it('uses ground_square for AIS targets', () => {
    expect(getBaseMarker(undefined, undefined, undefined, undefined, 'ais', 'ground')).toEqual([
      'ground_square',
      0.7,
    ]);
  });

  it('falls back to unknown when nothing matches', () => {
    expect(getBaseMarker(undefined, undefined, undefined, undefined, undefined, 30000)).toEqual([
      'unknown',
      1,
    ]);
  });
});

describe('svgShapeToDataUri', () => {
  it('produces a base64 svg data uri containing the shape path', () => {
    const uri = svgShapeToDataUri(shapes.airliner, '#abcdef', '#000000', 0.75, 1);
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const decoded = atob(uri.slice('data:image/svg+xml;base64,'.length));
    expect(decoded).toContain('<svg');
    expect(decoded).toContain('#abcdef');
  });
});

describe('selectMarker', () => {
  it('selects the airliner shape for an A320 by type code', () => {
    const ac = new Aircraft('a');
    ac.update({ hex: 'a', t: 'A320' }, 1);
    const { shape, scale } = selectMarker(ac);
    expect(shape).toBe(shapes.airliner);
    expect(scale).toBe(0.94);
  });

  it('selects a known shape (never undefined) for unmapped aircraft', () => {
    const ac = new Aircraft('a');
    const { shape } = selectMarker(ac);
    expect(shape).toBe(shapes.unknown);
  });
});
