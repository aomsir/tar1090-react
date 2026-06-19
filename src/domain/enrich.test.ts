import { describe, it, expect, vi } from 'vitest';
import { Aircraft } from './Aircraft';
import { enrichAircraft } from './enrich';

function deps(dbResult: [string, string, string, string] | null) {
  return {
    lookup: vi.fn(async () => dbResult),
    registrationFromHexId: (hex: string) => (hex === 'A00001' ? 'N1' : null),
  };
}

describe('enrichAircraft', () => {
  it('fills registration, type, flags and military from a DB hit', async () => {
    const ac = new Aircraft('008012');
    await enrichAircraft(ac, deps(['ZS-ABC', 'C172', '01', 'CESSNA 172']));
    expect(ac.registration).toBe('ZS-ABC');
    expect(ac.typeCode).toBe('C172');
    expect(ac.typeLong).toBe('CESSNA 172');
    expect(ac.dbFlags).toBe('01');
    expect(ac.isMilitary).toBe(true);
    expect(ac.country).toBe('South Africa');
    expect(ac.flagPath).toBe('/flags/3x2/ZA.svg');
    expect(ac.enrichmentState).toBe('done');
  });

  it('falls back to algorithmic registration when DB has no entry', async () => {
    const ac = new Aircraft('A00001');
    await enrichAircraft(ac, deps(null));
    expect(ac.registration).toBe('N1');
    expect(ac.typeCode).toBeUndefined();
    expect(ac.country).toBe('United States');
    expect(ac.enrichmentState).toBe('done');
  });

  it('maps AJ27 to C909 at runtime', async () => {
    const ac = new Aircraft('780001');
    await enrichAircraft(ac, deps(['B-001R', 'AJ27', '00', 'COMAC ARJ-21-700 Xiangfeng']));
    expect(ac.typeCode).toBe('C909');
    expect(ac.typeLong).toBe('COMAC C909');
  });

  it('leaves registration undefined when DB misses and hex is unallocated', async () => {
    const ac = new Aircraft('FFFFFF');
    await enrichAircraft(ac, deps(null));
    expect(ac.registration).toBeUndefined();
    expect(ac.enrichmentState).toBe('done');
  });
});
