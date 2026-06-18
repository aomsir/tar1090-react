import { describe, it, expect } from 'vitest';
import { Aircraft } from '@/domain/Aircraft';
import { toDetail } from './aircraftDetail';

describe('toDetail', () => {
  it('builds original-style detail groups with missing values', () => {
    const ac = new Aircraft('abc123');
    Object.assign(ac, {
      flight: 'CCA101',
      registration: 'B-2033',
      typeCode: 'B738',
      typeLong: 'BOEING 737-800',
      country: 'China',
      altitude: 35000,
      speed: 415,
      ias: 250,
      tas: 430,
      mach: 0.78,
      navAltitudeMcp: 32000,
      navQnh: 1013.2,
      windDirection: 280,
      windSpeed: 55,
      rssi: -8.4,
    });

    const detail = toDetail(ac);
    expect(detail.groups.map((g) => g.title)).toEqual([
      'Ground',
      'Ground',
      'Ground',
      'Ground',
      'Ground',
      'Ground',
    ]);
    expect(detail.groups.flatMap((g) => g.rows)).toContainEqual({ label: 'IAS', value: '250 kt' });
    expect(detail.groups.flatMap((g) => g.rows)).toContainEqual({ label: 'TAS', value: '430 kt' });
    expect(detail.groups.flatMap((g) => g.rows)).toContainEqual({ label: 'Mach', value: '0.78' });
    expect(detail.groups.flatMap((g) => g.rows)).toContainEqual({ label: 'MCP altitude', value: '32,000 ft' });
    expect(detail.groups.flatMap((g) => g.rows)).toContainEqual({ label: 'TAT', value: '—' });
  });

  it('maps enrichment and live fields into a detail view-model', () => {
    const a = new Aircraft('780ABC');
    Object.assign(a, {
      flight: 'CCA101',
      registration: 'B-2033',
      typeCode: 'A320',
      typeLong: 'Airbus A320',
      country: 'China',
      flagPath: 'flags/3x2/CN.svg',
      altitude: 35000,
      speed: 450,
      track: 90,
      vertRate: -64,
      squawk: '2000',
      messages: 1234,
      seen: 0.4,
      isMilitary: false,
      isMlat: true,
      lat: 31.2,
      lon: 121.4,
    });
    const d = toDetail(a);
    expect(d.hex).toBe('780ABC');
    expect(d.flight).toBe('CCA101');
    expect(d.typeLong).toBe('Airbus A320');
    expect(d.flagPath).toBe('flags/3x2/CN.svg');
    expect(d.isMlat).toBe(true);
    expect(d.hasPosition).toBe(true);
  });
});
