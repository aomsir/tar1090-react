import { describe, it, expect } from 'vitest';
import { createPTracksLayer, syncPTracks } from '@/map/pTracksLayer';
import type { TrackPoint } from '@/features/track/track';

describe('createPTracksLayer', () => {
  it('returns layer, source, and setSelectedHex function', () => {
    const handle = createPTracksLayer();
    expect(handle.layer).toBeDefined();
    expect(handle.source).toBeDefined();
    expect(typeof handle.setSelectedHex).toBe('function');
  });
});

describe('syncPTracks', () => {
  it('populates source with features from track map', () => {
    const handle = createPTracksLayer();
    const tracks = new Map<string, TrackPoint[]>([
      [
        'aa',
        [
          { lon: 110, lat: 30, alt: 10000, ts: 1000, ground: false },
          { lon: 110.1, lat: 30.1, alt: 11000, ts: 1010, ground: false },
        ],
      ],
      [
        'bb',
        [
          { lon: 111, lat: 31, alt: 5000, ts: 1000, ground: false },
          { lon: 111.1, lat: 31.1, alt: 6000, ts: 1010, ground: false },
        ],
      ],
    ]);
    syncPTracks(handle.source, tracks);
    const features = handle.source.getFeatures();
    expect(features.length).toBeGreaterThanOrEqual(2);
    const hexes = new Set(features.map((f) => f.get('hex')));
    expect(hexes.has('aa')).toBe(true);
    expect(hexes.has('bb')).toBe(true);
  });

  it('clears previous features on re-sync', () => {
    const handle = createPTracksLayer();
    const tracks = new Map<string, TrackPoint[]>([
      [
        'aa',
        [
          { lon: 110, lat: 30, alt: 10000, ts: 1000, ground: false },
          { lon: 110.1, lat: 30.1, alt: 11000, ts: 1010, ground: false },
        ],
      ],
    ]);
    syncPTracks(handle.source, tracks);
    const count1 = handle.source.getFeatures().length;
    syncPTracks(handle.source, new Map());
    expect(handle.source.getFeatures().length).toBe(0);
    expect(count1).toBeGreaterThan(0);
  });
});
