import { describe, it, expect } from 'vitest';
import { createPTracksLayer, syncPTracks, syncPTracksProgressive } from '@/map/pTracksLayer';
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

describe('syncPTracksProgressive', () => {
  const points = (lon: number): TrackPoint[] => [
    { lon, lat: 30, alt: 10_000, ts: 1_000, ground: false },
    { lon: lon + 0.1, lat: 30.1, alt: 11_000, ts: 1_010, ground: false },
  ];

  it('adds the first batch synchronously before yielding later batches', async () => {
    const handle = createPTracksLayer();
    let release: (() => void) | undefined;
    const yieldToMain = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const job = syncPTracksProgressive(
      handle.source,
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
      { batchSize: 1, yieldToMain },
    );

    expect(handle.source.getFeatures().map((feature) => feature.get('trackKey'))).toEqual([
      'first',
    ]);
    expect(yieldToMain).toHaveBeenCalledOnce();

    release?.();
    await job.done;

    expect(handle.source.getFeatures().map((feature) => feature.get('trackKey'))).toEqual([
      'first',
      'later',
    ]);
  });

  it('updates retained feature objects in place and removes stale features before adding', async () => {
    const handle = createPTracksLayer();
    await syncPTracksProgressive(
      handle.source,
      new Map([
        ['retained', points(110)],
        ['stale', points(111)],
      ]),
    ).done;
    const retained = handle.source
      .getFeatures()
      .find((feature) => feature.get('trackKey') === 'retained')!;
    const originalCoordinates = retained.getGeometry()!.getCoordinates();

    const job = syncPTracksProgressive(
      handle.source,
      new Map([
        ['retained', points(120)],
        ['added', points(121)],
      ]),
      { batchSize: 1, yieldToMain: async () => {} },
    );

    expect(
      handle.source.getFeatures().find((feature) => feature.get('trackKey') === 'retained'),
    ).toBe(retained);
    expect(retained.getGeometry()!.getCoordinates()).not.toEqual(originalCoordinates);
    expect(handle.source.getFeatureById('stale:0:0')).toBeNull();
    await job.done;
    expect(handle.source.getFeatureById('added:0:0')).toBeDefined();
  });

  it('stops adding later batches after cancellation and resolves done normally', async () => {
    const handle = createPTracksLayer();
    let release: (() => void) | undefined;
    const onComplete = vi.fn();
    const job = syncPTracksProgressive(
      handle.source,
      new Map([
        ['first', points(110)],
        ['later', points(111)],
      ]),
      {
        batchSize: 1,
        yieldToMain: () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
        onComplete,
      },
    );

    job.cancel();
    release?.();
    await job.done;

    expect(handle.source.getFeatures().map((feature) => feature.get('trackKey'))).toEqual([
      'first',
    ]);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('uses distinct stable ids for same-track subpaths and keeps all selected subpaths visible', async () => {
    const handle = createPTracksLayer();
    await syncPTracksProgressive(handle.source, new Map([['crossing', [points(110), points(120)]]]))
      .done;

    handle.setSelectedKey('crossing');

    expect(handle.source.getFeatures().map((feature) => feature.getId())).toEqual([
      'crossing:0:1',
      'crossing:1:1',
    ]);
    expect(handle.source.getFeatures().every(handle.isFeatureVisible)).toBe(true);
  });

  it('fires first and completion callbacks once for an empty desired set', async () => {
    const handle = createPTracksLayer();
    syncPTracks(handle.source, new Map([['stale', points(110)]]));
    const onFirstBatch = vi.fn();
    const onComplete = vi.fn();

    await syncPTracksProgressive(handle.source, new Map(), { onFirstBatch, onComplete }).done;

    expect(handle.source.getFeatures()).toHaveLength(0);
    expect(onFirstBatch).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it.each([Number.NaN, 0, -1, 1.5, Number.POSITIVE_INFINITY])(
    'normalizes invalid batch size %s without skipping features or hanging',
    async (batchSize) => {
      const handle = createPTracksLayer();

      await syncPTracksProgressive(
        handle.source,
        new Map([
          ['first', points(110)],
          ['second', points(111)],
        ]),
        { batchSize, yieldToMain: async () => {} },
      ).done;

      expect(handle.source.getFeatures().map((feature) => feature.get('trackKey'))).toEqual([
        'first',
        'second',
      ]);
    },
  );

  it('does not inspect later paths until the scheduler releases the next batch', async () => {
    const handle = createPTracksLayer();
    let release: (() => void) | undefined;
    let laterPointReads = 0;
    const laterPoints = [] as TrackPoint[];
    Object.defineProperties(laterPoints, {
      0: {
        enumerable: true,
        get: () => {
          laterPointReads += 1;
          return { lon: 111, lat: 31, alt: 5_000, ts: 1_000, ground: false };
        },
      },
      1: {
        enumerable: true,
        get: () => {
          laterPointReads += 1;
          return { lon: 111.1, lat: 31.1, alt: 6_000, ts: 1_010, ground: false };
        },
      },
      length: { value: 2 },
    });

    const job = syncPTracksProgressive(
      handle.source,
      new Map([
        ['first', points(110)],
        ['later', laterPoints],
      ]),
      {
        batchSize: 1,
        yieldToMain: () => new Promise<void>((resolve) => (release = resolve)),
      },
    );

    expect(handle.source.getFeatures().map((feature) => feature.get('trackKey'))).toEqual(['first']);
    expect(laterPointReads).toBe(0);

    release?.();
    await job.done;

    expect(laterPointReads).toBeGreaterThan(0);
    expect(handle.source.getFeatures().map((feature) => feature.get('trackKey'))).toEqual([
      'first',
      'later',
    ]);
  });

  it('reads only the prefix needed to produce the first changing-color segment batch', async () => {
    const handle = createPTracksLayer();
    const releases: (() => void)[] = [];
    let reads = 0;
    const points = [] as TrackPoint[];
    for (let index = 0; index < 8; index += 1) {
      Object.defineProperty(points, index, {
        enumerable: true,
        get: () => {
          reads = Math.max(reads, index + 1);
          return {
            lon: 110 + index / 10,
            lat: 30,
            alt: index % 2 === 0 ? 1_000 : 35_000,
            ts: 1_000 + index * 10,
            ground: false,
          };
        },
      });
    }
    Object.defineProperty(points, 'length', { value: 8 });

    const job = syncPTracksProgressive(handle.source, new Map([['changing', points]]), {
      batchSize: 1,
      yieldToMain: () =>
        new Promise<void>((resolve) => {
          releases.push(resolve);
        }),
    });

    expect(handle.source.getFeatures()).toHaveLength(1);
    expect(reads).toBe(3);

    releases.shift()?.();
    await Promise.resolve();
    expect(reads).toBeGreaterThan(3);
    job.cancel();
    releases.shift()?.();
    await job.done;
  });

  it('absorbs callback and scheduler errors without rejecting done or adding later batches', async () => {
    const handle = createPTracksLayer();
    const onComplete = vi.fn();
    const job = syncPTracksProgressive(
      handle.source,
      new Map([
        ['first', points(110)],
        ['later', points(111)],
      ]),
      {
        batchSize: 1,
        onFirstBatch: () => {
          throw new Error('first callback failed');
        },
        onComplete,
      },
    );

    await expect(job.done).resolves.toBeUndefined();
    expect(handle.source.getFeatures().map((feature) => feature.get('trackKey'))).toEqual(['first']);
    expect(onComplete).not.toHaveBeenCalled();

    const schedulerFailure = syncPTracksProgressive(
      handle.source,
      new Map([
        ['first', points(120)],
        ['later', points(121)],
      ]),
      { batchSize: 1, yieldToMain: async () => Promise.reject(new Error('scheduler failed')) },
    );

    await expect(schedulerFailure.done).resolves.toBeUndefined();
    expect(handle.source.getFeatures().map((feature) => feature.get('trackKey'))).toEqual(['first']);
  });

  it('absorbs completion callback errors without rejecting done', async () => {
    const handle = createPTracksLayer();
    const job = syncPTracksProgressive(handle.source, new Map([['only', points(110)]]), {
      onComplete: () => {
        throw new Error('completion callback failed');
      },
    });

    await expect(job.done).resolves.toBeUndefined();
    expect(handle.source.getFeatures()).toHaveLength(1);
  });
});
