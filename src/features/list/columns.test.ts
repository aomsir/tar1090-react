import { describe, expect, it } from 'vitest';
import { DEFAULT_HIDDEN_COLUMNS, LIST_COLUMNS, visibleColumnIds } from './columns';

describe('tar1090 list columns', () => {
  it('keeps original tar1090 column order', () => {
    expect(LIST_COLUMNS.map((c) => c.id)).toEqual([
      'icao',
      'flag',
      'flight',
      'route',
      'registration',
      'aircraft_type',
      'squawk',
      'altitude',
      'speed',
      'vert_rate',
      'distance',
      'track',
      'msgs',
      'seen',
      'rssi',
      'lat',
      'lon',
      'data_source',
      'military',
      'wd',
      'ws',
    ]);
  });

  it('uses original default hidden columns', () => {
    expect(DEFAULT_HIDDEN_COLUMNS).toEqual([
      'icao',
      'registration',
      'vert_rate',
      'track',
      'msgs',
      'seen',
      'lat',
      'lon',
      'data_source',
      'military',
      'wd',
      'ws',
    ]);
    expect(visibleColumnIds(new Set(DEFAULT_HIDDEN_COLUMNS))).toEqual([
      'flag',
      'flight',
      'route',
      'aircraft_type',
      'squawk',
      'altitude',
      'speed',
      'distance',
      'rssi',
    ]);
  });
});
