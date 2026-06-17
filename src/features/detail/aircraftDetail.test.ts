import { describe, it, expect } from 'vitest';
import { Aircraft } from '@/domain/Aircraft';
import { toDetail } from './aircraftDetail';

describe('toDetail', () => {
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
