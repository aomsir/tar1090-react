import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '@/i18n';
import { toDetail, toPassDetail } from '@/features/detail/aircraftDetail';
import { Aircraft } from '@/domain/Aircraft';
import type { AircraftPass } from '@/features/playback/aircraftPasses';

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
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('each group has a color field', () => {
    const detail = toDetail(makeAircraft(), i18n.t, i18n.language);
    for (const group of detail.groups) {
      expect(group.color).toBeDefined();
      expect(typeof group.color).toBe('string');
    }
  });

  it('groups have distinct colors in expected order', () => {
    const detail = toDetail(makeAircraft(), i18n.t, i18n.language);
    const colors = detail.groups.map((g) => g.color);
    expect(colors).toEqual(['indigo', 'emerald', 'sky', 'slate', 'amber', 'teal']);
  });

  it('flightStatus group does not contain altitude, ground speed, or track rows', () => {
    const detail = toDetail(makeAircraft(), i18n.t, i18n.language);
    const flightGroup = detail.groups.find((g) => g.title === 'Flight status');
    expect(flightGroup).toBeDefined();
    const labels = flightGroup!.rows.map((r) => r.label);
    expect(labels).not.toContain('Altitude');
    expect(labels).not.toContain('Ground speed');
    expect(labels).not.toContain('Track');
  });

  it('builds pass detail from pass maxima rather than the final aircraft sample', () => {
    const pass: AircraftPass = {
      passId: '780abc:100',
      hex: '780abc',
      startTime: 100,
      endTime: 160,
      aircraft: makeAircraft({ altitude: 1200, speed: 180 }),
      trackPoints: [],
      maxAltitude: 38000,
      maxSpeed: 490,
      maxDistance: 42.34,
      hadAltitude: true,
      hadGround: false,
      hadEmergency: false,
      hadSquawk: false,
    };

    expect(toPassDetail(pass, i18n.t, i18n.language)).toMatchObject({
      passId: '780abc:100',
      passStartTime: 100,
      passEndTime: 160,
      maxDistance: 42.34,
      altitude: 38000,
      speed: 490,
    });
  });

  it('keeps ground-only passes aligned with the existing ground altitude detail', () => {
    const pass: AircraftPass = {
      passId: '780abc:100',
      hex: '780abc',
      startTime: 100,
      endTime: 100,
      aircraft: makeAircraft({ altitude: 'ground', speed: 0 }),
      trackPoints: [],
      maxSpeed: 0,
      hadAltitude: true,
      hadGround: true,
      hadEmergency: false,
      hadSquawk: false,
    };

    expect(toPassDetail(pass, i18n.t, i18n.language).altitude).toBe('ground');
  });
});

describe('aircraftDetail i18n', () => {
  it('builds translated detail labels in zh-CN', async () => {
    await i18n.changeLanguage('zh-CN');
    const detail = toDetail(makeAircraft({ messages: 1234 }), i18n.t, i18n.language);

    expect(detail.groups[0].title).toBe('身份');
    expect(detail.groups[0].rows.some((row) => row.label === '注册号')).toBe(true);
  });

  it('formats MCP/FMS altitude values using the zh-CN locale', async () => {
    await i18n.changeLanguage('zh-CN');
    const detail = toDetail(makeAircraft({ navAltitudeMcp: 35000 }), i18n.t, i18n.language);
    const navGroup = detail.groups.find((g) => g.title === '导航');
    expect(navGroup).toBeDefined();
    const mcpRow = navGroup!.rows.find((r) => r.label === 'MCP 高度');
    expect(mcpRow).toBeDefined();
    expect(mcpRow!.value).toBe('35,000 ft');
  });
});
