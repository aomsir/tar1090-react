import { describe, it, expect } from 'vitest';
import { Aircraft } from '@/domain/Aircraft';
import { toRow, buildRows, isInExtent, type RowQuery } from './aircraftRows';

function ac(
  hex: string,
  fields: Partial<{
    flight: string;
    registration: string;
    typeCode: string;
    altitude: number | 'ground';
    speed: number;
    lat: number;
    lon: number;
    isMilitary: boolean;
  }> = {},
): Aircraft {
  const a = new Aircraft(hex);
  Object.assign(a, fields);
  return a;
}

const base: RowQuery = {
  query: '',
  filter: 'all',
  sortKey: 'altitude',
  sortDir: 'desc',
  inViewOnly: false,
  extent: null,
};

describe('toRow', () => {
  it('maps aircraft fields to a row view-model', () => {
    const row = toRow(ac('ABC123', { flight: 'CCA101', registration: 'B-2033', altitude: 35000 }));
    expect(row.hex).toBe('ABC123');
    expect(row.flight).toBe('CCA101');
    expect(row.registration).toBe('B-2033');
    expect(row.altitude).toBe(35000);
  });
});

describe('isInExtent', () => {
  it('returns true only when inside bounds and coords defined', () => {
    expect(isInExtent(10, 20, [0, 0, 30, 30])).toBe(true);
    expect(isInExtent(40, 20, [0, 0, 30, 30])).toBe(false);
    expect(isInExtent(undefined, 20, [0, 0, 30, 30])).toBe(false);
  });
});

describe('buildRows', () => {
  const fleet = [
    ac('A1', {
      flight: 'CCA101',
      registration: 'B-2033',
      altitude: 35000,
      speed: 450,
      lat: 10,
      lon: 10,
    }),
    ac('A2', {
      flight: 'CES202',
      registration: 'B-5000',
      altitude: 'ground',
      speed: 0,
      lat: 10,
      lon: 50,
    }),
    ac('A3', { flight: 'MIL999', registration: '01', altitude: 12000, speed: 300, isMilitary: true }),
  ];

  it('filters by query against hex/flight/registration (case-insensitive)', () => {
    const rows = buildRows(fleet, { ...base, query: 'cca' });
    expect(rows.map((r) => r.hex)).toEqual(['A1']);
  });

  it('filters airborne vs ground vs military', () => {
    expect(buildRows(fleet, { ...base, filter: 'ground' }).map((r) => r.hex)).toEqual(['A2']);
    expect(buildRows(fleet, { ...base, filter: 'military' }).map((r) => r.hex)).toEqual(['A3']);
    expect(buildRows(fleet, { ...base, filter: 'airborne' }).map((r) => r.hex).sort()).toEqual([
      'A1',
      'A3',
    ]);
  });

  it('sorts by altitude descending then ascending', () => {
    expect(
      buildRows(fleet, { ...base, sortKey: 'altitude', sortDir: 'desc' }).map((r) => r.hex),
    ).toEqual(['A1', 'A3', 'A2']);
    expect(
      buildRows(fleet, { ...base, sortKey: 'altitude', sortDir: 'asc' }).map((r) => r.hex),
    ).toEqual(['A2', 'A3', 'A1']);
  });

  it('applies in-view filter using extent', () => {
    const rows = buildRows(fleet, {
      ...base,
      inViewOnly: true,
      extent: [0, 0, 20, 20],
    });
    expect(rows.map((r) => r.hex)).toEqual(['A1']);
  });
});
