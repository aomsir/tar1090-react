import { describe, it, expect } from 'vitest';
import { toDetail } from './aircraftDetail';
import { Aircraft } from '@/domain/Aircraft';

function makeAircraft(overrides: Partial<Aircraft> = {}): Aircraft {
  const ac = new Aircraft('780ABC');
  Object.assign(ac, {
    flight: 'CCA101',
    registration: 'B-2033',
    typeCode: 'A320',
    country: 'China',
    altitude: 35000,
    speed: 468,
    track: 247,
    ...overrides,
  });
  return ac;
}

describe('aircraftDetail', () => {
  it('each group has a color field', () => {
    const detail = toDetail(makeAircraft());
    for (const group of detail.groups) {
      expect(group.color).toBeDefined();
      expect(typeof group.color).toBe('string');
    }
  });

  it('groups have distinct colors in expected order', () => {
    const detail = toDetail(makeAircraft());
    const colors = detail.groups.map((g) => g.color);
    expect(colors).toEqual(['indigo', 'emerald', 'sky', 'amber', 'teal', 'slate']);
  });

  it('flightStatus group does not contain altitude, ground speed, or track rows', () => {
    const detail = toDetail(makeAircraft());
    const flightGroup = detail.groups.find((g) => g.title === 'Flight status');
    expect(flightGroup).toBeDefined();
    const labels = flightGroup!.rows.map((r) => r.label);
    expect(labels).not.toContain('Altitude');
    expect(labels).not.toContain('Ground speed');
    expect(labels).not.toContain('Track');
  });
});
