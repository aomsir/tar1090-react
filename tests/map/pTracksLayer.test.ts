import { describe, it, expect } from 'vitest';
import { createPTracksLayer, syncPTracks } from '@/map/pTracksLayer';
import type { TrackPoint } from '@/features/track/track';

describe('createPTracksLayer', () => {
  it('returns layer, source, and setSelectedKey function', () => {
    const handle = createPTracksLayer();
    expect(handle.layer).toBeDefined();
    expect(handle.source).toBeDefined();
    expect(typeof handle.setSelectedKey).toBe('function');
    expect(typeof handle.isFeatureVisible).toBe('function');
  });

  it('keeps all features with valid track keys visible when no key is selected', () => {
    const handle = createPTracksLayer();
    syncPTracks(
      handle.source,
      new Map([
        [
          'pass-a',
          [
            { lon: 110, lat: 30, alt: 10000, ts: 1000, ground: false },
            { lon: 110.1, lat: 30.1, alt: 11000, ts: 1010, ground: false },
          ],
        ],
        [
          'pass-b',
          [
            { lon: 111, lat: 31, alt: 5000, ts: 1000, ground: false },
            { lon: 111.1, lat: 31.1, alt: 6000, ts: 1010, ground: false },
          ],
        ],
      ]),
    );

    expect(handle.source.getFeatures().every(handle.isFeatureVisible)).toBe(true);
  });

  it('keeps only the selected pass visible', () => {
    const handle = createPTracksLayer();
    syncPTracks(
      handle.source,
      new Map([
        [
          'pass-a',
          [
            { lon: 110, lat: 30, alt: 10000, ts: 1000, ground: false },
            { lon: 110.1, lat: 30.1, alt: 11000, ts: 1010, ground: false },
          ],
        ],
        [
          'pass-b',
          [
            { lon: 111, lat: 31, alt: 5000, ts: 1000, ground: false },
            { lon: 111.1, lat: 31.1, alt: 6000, ts: 1010, ground: false },
          ],
        ],
      ]),
    );

    handle.setSelectedKey('pass-b');

    expect(
      handle.source
        .getFeatures()
        .filter(handle.isFeatureVisible)
        .map((feature) => feature.get('trackKey')),
    ).toEqual(['pass-b']);
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

  it('renders every clipped subpath for a pass', () => {
    const handle = createPTracksLayer();
    syncPTracks(
      handle.source,
      new Map([
        [
          'crossing',
          [
            [
              { lon: 110, lat: 30, alt: 5_000, ts: 1_000, ground: false },
              { lon: 110.1, lat: 30.1, alt: 10_000, ts: 1_010, ground: false },
            ],
            [
              { lon: 110.2, lat: 30.2, alt: 10_000, ts: 1_020, ground: false },
              { lon: 110.3, lat: 30.3, alt: 5_000, ts: 1_030, ground: false },
            ],
          ],
        ],
      ]),
    );

    expect(handle.source.getFeatures()).toHaveLength(2);
    expect(handle.source.getFeatures().every((feature) => feature.get('trackKey') === 'crossing')).toBe(
      true,
    );
  });

  it('ignores empty legacy and nested tracks', () => {
    const handle = createPTracksLayer();

    syncPTracks(handle.source, new Map([['empty-legacy', []], ['empty-nested', []]]));

    expect(handle.source.getFeatures()).toHaveLength(0);
  });

  it('rejects mixed legacy and nested path input', () => {
    const handle = createPTracksLayer();
    const point = { lon: 110, lat: 30, alt: 5_000, ts: 1_000, ground: false };

    expect(() => syncPTracks(handle.source, new Map([['mixed', [point, [point, point]]]]))).toThrow(
      TypeError,
    );
  });
});
