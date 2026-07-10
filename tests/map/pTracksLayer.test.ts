import { describe, it, expect } from 'vitest';
import { createPTracksLayer, syncPTracks } from '@/map/pTracksLayer';
import type { TrackPoint } from '@/features/track/track';

describe('createPTracksLayer', () => {
  it('returns layer, source, and setSelectedKey function', () => {
    const handle = createPTracksLayer();
    expect(handle.layer).toBeDefined();
    expect(handle.source).toBeDefined();
    expect(typeof handle.setSelectedKey).toBe('function');
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
    const keys = new Set(features.map((f) => f.get('trackKey')));
    expect(keys.has('aa')).toBe(true);
    expect(keys.has('bb')).toBe(true);
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

  it('filters same-hex pass tracks by their distinct track keys', () => {
    const handle = createPTracksLayer();
    syncPTracks(
      handle.source,
      new Map([
        [
          'abc123:1000',
          [
            { lon: 110, lat: 30, alt: 10000, ts: 1000, ground: false },
            { lon: 110.1, lat: 30.1, alt: 11000, ts: 1010, ground: false },
          ],
        ],
        [
          'abc123:50000',
          [
            { lon: 111, lat: 31, alt: 5000, ts: 50000, ground: false },
            { lon: 111.1, lat: 31.1, alt: 6000, ts: 50010, ground: false },
          ],
        ],
      ]),
    );

    const [first, second] = handle.source.getFeatures();
    const style = handle.layer.getStyleFunction()!;
    handle.setSelectedKey('abc123:50000');

    expect(first.get('trackKey')).toBe('abc123:1000');
    expect(second.get('trackKey')).toBe('abc123:50000');
    expect(style(first, 1).getStroke()).toBeNull();
    expect(style(second, 1).getStroke()).toBeDefined();
  });
});
