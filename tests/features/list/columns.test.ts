import { describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import {
  createListColumns,
  DEFAULT_HIDDEN_COLUMNS,
  LIST_COLUMNS,
  visibleColumnIds,
} from '@/features/list/columns';
import type { AircraftRow } from '@/features/list/aircraftRows';

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
      'last_seen',
      'pass_time',
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
      'last_seen',
      'route',
    ]);
    expect(visibleColumnIds(new Set(DEFAULT_HIDDEN_COLUMNS))).toEqual([
      'flag',
      'flight',
      'aircraft_type',
      'squawk',
      'altitude',
      'speed',
      'distance',
      'rssi',
      'pass_time',
    ]);
  });
});

describe('createListColumns', () => {
  it('produces Simplified Chinese column labels', async () => {
    await i18n.changeLanguage('zh-CN');
    const columns = createListColumns(i18n.t);

    expect(columns.find((c) => c.id === 'flight')?.label).toBe('呼号');
    expect(columns.find((c) => c.id === 'msgs')?.label).toBe('报文数');
    expect(columns.find((c) => c.id === 'altitude')?.label).toBe('高度 (ft)');
  });

  it('produces English column labels by default', async () => {
    await i18n.changeLanguage('en');
    const columns = createListColumns(i18n.t);

    expect(columns.find((c) => c.id === 'flight')?.label).toBe('Callsign');
    expect(columns.find((c) => c.id === 'msgs')?.label).toBe('Messages');
  });

  it('keeps the same column ids and order as LIST_COLUMNS', async () => {
    await i18n.changeLanguage('en');
    const columns = createListColumns(i18n.t);

    expect(columns.map((c) => c.id)).toEqual(LIST_COLUMNS.map((c) => c.id));
  });

  it('translates military yes/no display values without changing sort values', async () => {
    await i18n.changeLanguage('zh-CN');
    const columns = createListColumns(i18n.t);
    const military = columns.find((c) => c.id === 'military');
    expect(military).toBeDefined();

    const yesRow = { isMilitary: true } as unknown as AircraftRow;
    const noRow = { isMilitary: false } as unknown as AircraftRow;
    expect(military?.format(yesRow)).toBe('是');
    expect(military?.format(noRow)).toBe('否');
    expect(military?.sortValue(yesRow)).toBe('yes');
    expect(military?.sortValue(noRow)).toBe('no');
  });

  it('translates the Other/Unknown data source UI words while preserving abbreviations', async () => {
    await i18n.changeLanguage('zh-CN');
    const columns = createListColumns(i18n.t);
    const source = columns.find((c) => c.id === 'data_source');
    expect(source).toBeDefined();

    const baseRow = { dataSource: '' } as unknown as AircraftRow;
    expect(source?.format({ ...baseRow, dataSource: 'adsb_icao' })).toBe('ADS-B');
    expect(source?.format({ ...baseRow, dataSource: 'mlat' })).toBe('MLAT');
    expect(source?.format({ ...baseRow, dataSource: 'other' })).toBe('其他');
    expect(source?.format({ ...baseRow, dataSource: 'unknown' })).toBe('未知');
    expect(source?.format({ ...baseRow, dataSource: 'invalid' })).toBe('未知');
  });
});
