import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Aircraft } from '@/domain/Aircraft';
import { toRow, buildRows, isInExtent, type RowQuery } from './aircraftRows';
import { routeService } from '@/data/routeService';
import { LIST_COLUMNS } from './columns';
import type { PeakStats } from '@/features/playback/pTracks';

async function seedRoute(callsign: string, route: string) {
  const [origin, destination] = route.split(' - ');
  const body = JSON.stringify({
    response: {
      flightroute: { origin: { iata_code: origin }, destination: { iata_code: destination } },
    },
  });
  const fetchFn = vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
  routeService.enqueue(callsign);
  await routeService.flush('https://test', fetchFn);
}

function ac(
  hex: string,
  fields: Partial<{
    flight: string;
    registration: string;
    typeCode: string;
    altitude: number | 'ground';
    speed: number;
    squawk: string;
    rssi: number;
    country: string;
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

  it('maps squawk, messages and rssi', () => {
    const a = ac('ABC123', { squawk: '7700', rssi: -12.5 });
    a.messages = 42;
    const row = toRow(a);
    expect(row.squawk).toBe('7700');
    expect(row.messages).toBe(42);
    expect(row.rssi).toBe(-12.5);
  });

  it('maps route, distance, dataSource, wind fields from toRow', () => {
    const a = ac('WIND1', { flight: 'TEST1' });
    a.addrType = 'adsb';
    a.windDirection = 280;
    a.windSpeed = 55;
    const row = toRow(a, 12.34);
    expect(row.route).toBe('');
    expect(row.distance).toBe(12.34);
    expect(row.dataSource).toBe('adsb');
    expect(row.windDirection).toBe(280);
    expect(row.windSpeed).toBe(55);
  });

  it('uses vertRate from ac.vertRate when present', () => {
    const a = ac('VR1', { flight: 'A' });
    a.vertRate = 500;
    a.baroRate = 600;
    a.geomRate = 700;
    expect(toRow(a).vertRate).toBe(500);
  });

  it('falls back to baroRate when vertRate missing', () => {
    const a = ac('VR2', { flight: 'B' });
    a.baroRate = -300;
    a.geomRate = -400;
    expect(toRow(a).vertRate).toBe(-300);
  });

  it('falls back to geomRate when vertRate and baroRate missing', () => {
    const a = ac('VR3', { flight: 'C' });
    a.geomRate = 128;
    expect(toRow(a).vertRate).toBe(128);
  });

  it('maps lastUpdated=0 to lastSeenTime=undefined', () => {
    const a = ac('Z0', { flight: 'A' });
    a.lastUpdated = 0;
    expect(toRow(a).lastSeenTime).toBeUndefined();
  });

  it('maps positive lastUpdated to lastSeenTime', () => {
    const a = ac('Z1', { flight: 'B' });
    a.lastUpdated = 1718812800;
    expect(toRow(a).lastSeenTime).toBe(1718812800);
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
    ac('A3', {
      flight: 'MIL999',
      registration: '01',
      altitude: 12000,
      speed: 300,
      isMilitary: true,
    }),
  ];

  it('filters by query against hex/flight/registration (case-insensitive)', () => {
    const rows = buildRows(fleet, { ...base, query: 'cca' });
    expect(rows.map((r) => r.hex)).toEqual(['A1']);
  });

  it('matches query against type code, squawk and country', () => {
    const extra = [
      ac('T1', { flight: 'X', typeCode: 'B738' }),
      ac('T2', { flight: 'Y', squawk: '7700' }),
      ac('T3', { flight: 'Z', country: 'Germany' }),
    ];
    expect(buildRows(extra, { ...base, query: 'b738' }).map((r) => r.hex)).toEqual(['T1']);
    expect(buildRows(extra, { ...base, query: '7700' }).map((r) => r.hex)).toEqual(['T2']);
    expect(buildRows(extra, { ...base, query: 'german' }).map((r) => r.hex)).toEqual(['T3']);
  });

  it('keeps aircraft with missing sort values at the end in both directions', () => {
    const fleet2 = [
      ac('M1', { flight: 'A', altitude: 10000 }),
      ac('M2', { flight: 'B' }), // no altitude
      ac('M3', { flight: 'C', altitude: 20000 }),
    ];
    expect(
      buildRows(fleet2, { ...base, sortKey: 'altitude', sortDir: 'desc' }).map((r) => r.hex),
    ).toEqual(['M3', 'M1', 'M2']);
    expect(
      buildRows(fleet2, { ...base, sortKey: 'altitude', sortDir: 'asc' }).map((r) => r.hex),
    ).toEqual(['M1', 'M3', 'M2']);
  });

  it('sorts by squawk with empty squawks last', () => {
    const fleet3 = [
      ac('S1', { flight: 'A', squawk: '2000' }),
      ac('S2', { flight: 'B' }),
      ac('S3', { flight: 'C', squawk: '1000' }),
    ];
    expect(
      buildRows(fleet3, { ...base, sortKey: 'squawk', sortDir: 'asc' }).map((r) => r.hex),
    ).toEqual(['S3', 'S1', 'S2']);
  });

  it('filters airborne vs ground vs military', () => {
    expect(buildRows(fleet, { ...base, filter: 'ground' }).map((r) => r.hex)).toEqual(['A2']);
    expect(buildRows(fleet, { ...base, filter: 'military' }).map((r) => r.hex)).toEqual(['A3']);
    expect(
      buildRows(fleet, { ...base, filter: 'airborne' })
        .map((r) => r.hex)
        .sort(),
    ).toEqual(['A1', 'A3']);
  });

  it('sorts by altitude descending then ascending', () => {
    expect(
      buildRows(fleet, { ...base, sortKey: 'altitude', sortDir: 'desc' }).map((r) => r.hex),
    ).toEqual(['A1', 'A3', 'A2']);
    expect(
      buildRows(fleet, { ...base, sortKey: 'altitude', sortDir: 'asc' }).map((r) => r.hex),
    ).toEqual(['A2', 'A3', 'A1']);
  });

  it('sorts by distance with missing values last', () => {
    const dFleet = [
      ac('D1', { flight: 'A', lat: 39, lon: 116 }),
      ac('D2', { flight: 'B', lat: 40, lon: 117 }),
      ac('D3', { flight: 'C' }),
    ];
    const q: RowQuery = {
      ...base,
      sortKey: 'distance',
      sortDir: 'asc',
      siteLat: 39.9,
      siteLon: 116.4,
    };
    const rows = buildRows(dFleet, q);
    expect(rows[rows.length - 1].hex).toBe('D3');
    expect(rows[0].distance).toBeLessThan(rows[1].distance!);
  });

  it('sorts by seen with missing values last', () => {
    const sFleet = [
      ac('S1', { flight: 'A' }),
      ac('S2', { flight: 'B' }),
      ac('S3', { flight: 'C' }),
    ];
    sFleet[0].seen = 10;
    sFleet[1].seen = 2;
    sFleet[2].seen = Infinity;
    const q: RowQuery = { ...base, sortKey: 'seen', sortDir: 'asc' };
    const rows = buildRows(sFleet, q);
    expect(rows.map((r) => r.hex)).toEqual(['S2', 'S1', 'S3']);
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

it('formats original tar1090 columns from row data', () => {
  const row = {
    hex: 'abc123',
    flight: 'CCA101',
    route: '',
    registration: 'B-2033',
    typeCode: 'B738',
    squawk: '2000',
    altitude: 35000,
    speed: 415,
    vertRate: -512,
    distance: 12.34,
    track: 270,
    messages: 42,
    seen: 3.2,
    rssi: -8.4,
    lat: 34.2385,
    lon: 108.9418,
    dataSource: '',
    isMilitary: true,
    windDirection: 280,
    windSpeed: 55,
    country: 'China',
    flagPath: '/flags/3x2/CN.svg',
    isMlat: false,
    lastSeenTime: undefined,
  };
  const byId = Object.fromEntries(LIST_COLUMNS.map((c) => [c.id, c]));
  expect(byId.registration.format(row)).toBe('B-2033');
  expect(byId.aircraft_type.format(row)).toBe('B738');
  expect(byId.vert_rate.format(row)).toBe('-512');
  expect(byId.distance.format(row)).toBe('12.3');
  expect(byId.rssi.format(row)).toBe('-8.4');
  expect(byId.lat.format(row)).toBe('34.2385');
  expect(byId.lon.format(row)).toBe('108.9418');
  expect(byId.military.format(row)).toBe('yes');
  expect(byId.wd.format(row)).toBe('280°');
  expect(byId.ws.format(row)).toBe('55');
});

it('formats data source values like original tar1090', () => {
  const col = LIST_COLUMNS.find((c) => c.id === 'data_source');
  expect(col).toBeDefined();

  const baseRow = {
    hex: 'abc',
    flight: '',
    route: '',
    registration: '',
    typeCode: '',
    squawk: '',
    altitude: undefined,
    speed: undefined,
    vertRate: undefined,
    distance: undefined,
    track: undefined,
    messages: 0,
    seen: 0,
    rssi: undefined,
    lat: undefined,
    lon: undefined,
    country: '',
    flagPath: null,
    isMilitary: false,
    isMlat: false,
    windDirection: undefined,
    windSpeed: undefined,
    lastSeenTime: undefined,
  };

  expect(col?.format({ ...baseRow, dataSource: 'adsb_icao' })).toBe('ADS-B');
  expect(col?.format({ ...baseRow, dataSource: 'mlat' })).toBe('MLAT');
  expect(col?.format({ ...baseRow, dataSource: 'mode_s' })).toBe('Mode S');
  expect(col?.format({ ...baseRow, dataSource: 'uat' })).toBe('UAT');
  expect(col?.format({ ...baseRow, dataSource: 'adsb' })).toBe('ADS-B');
  expect(col?.format({ ...baseRow, dataSource: 'adsb_other' })).toBe('ADS-B');
  expect(col?.format({ ...baseRow, dataSource: 'adsb_icao_nt' })).toBe('ADS-B noTP');
  expect(col?.format({ ...baseRow, dataSource: 'adsr' })).toBe('ADS-R or UAT');
  expect(col?.format({ ...baseRow, dataSource: 'tisb' })).toBe('TIS-B');
  expect(col?.format({ ...baseRow, dataSource: 'modeS' })).toBe('Mode S');
  expect(col?.format({ ...baseRow, dataSource: 'ais' })).toBe('AIS');
  expect(col?.format({ ...baseRow, dataSource: 'mode_ac' })).toBe('Mode A/C');
  expect(col?.format({ ...baseRow, dataSource: 'adsc' })).toBe('Sat. ADS-C');
  expect(col?.format({ ...baseRow, dataSource: 'other' })).toBe('Other');
  expect(col?.format({ ...baseRow, dataSource: 'unknown' })).toBe('Unknown');
  expect(col?.format({ ...baseRow, dataSource: '' })).toBe('');
  expect(col?.format({ ...baseRow, dataSource: 'invalid' })).toBe('Unknown');
});

describe('last_seen column format', () => {
  it('formats lastSeenTime as local HH:mm:ss, not raw epoch', () => {
    const row = {
      hex: 'a',
      flight: '',
      route: '',
      registration: '',
      typeCode: '',
      squawk: '',
      altitude: undefined,
      speed: undefined,
      vertRate: undefined,
      distance: undefined,
      track: undefined,
      messages: 0,
      seen: 0,
      rssi: undefined,
      lat: undefined,
      lon: undefined,
      dataSource: '',
      country: '',
      flagPath: null,
      isMilitary: false,
      isMlat: false,
      windDirection: undefined,
      windSpeed: undefined,
      lastSeenTime: 1718812800,
    };
    const byId = Object.fromEntries(LIST_COLUMNS.map((c) => [c.id, c]));
    const formatted = byId.last_seen.format(row);
    expect(formatted).not.toBe('1718812800');
    expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('returns empty string when lastSeenTime is undefined', () => {
    const row = {
      hex: 'a',
      flight: '',
      route: '',
      registration: '',
      typeCode: '',
      squawk: '',
      altitude: undefined,
      speed: undefined,
      vertRate: undefined,
      distance: undefined,
      track: undefined,
      messages: 0,
      seen: 0,
      rssi: undefined,
      lat: undefined,
      lon: undefined,
      dataSource: '',
      country: '',
      flagPath: null,
      isMilitary: false,
      isMlat: false,
      windDirection: undefined,
      windSpeed: undefined,
      lastSeenTime: undefined,
    };
    const byId = Object.fromEntries(LIST_COLUMNS.map((c) => [c.id, c]));
    expect(byId.last_seen.format(row)).toBe('');
  });
});

describe('buildRows sort by last_seen', () => {
  it('sorts by lastSeenTime descending', () => {
    const f1 = ac('LS1', { flight: 'A' });
    f1.lastUpdated = 100;
    const f2 = ac('LS2', { flight: 'B' });
    f2.lastUpdated = 300;
    const f3 = ac('LS3', { flight: 'C' });
    f3.lastUpdated = 200;
    const rows = buildRows([f1, f2, f3], { ...base, sortKey: 'last_seen', sortDir: 'desc' });
    expect(rows.map((r) => r.hex)).toEqual(['LS2', 'LS3', 'LS1']);
  });

  it('sorts by lastSeenTime ascending', () => {
    const f1 = ac('LS1', { flight: 'A' });
    f1.lastUpdated = 100;
    const f2 = ac('LS2', { flight: 'B' });
    f2.lastUpdated = 300;
    const f3 = ac('LS3', { flight: 'C' });
    f3.lastUpdated = 200;
    const rows = buildRows([f1, f2, f3], { ...base, sortKey: 'last_seen', sortDir: 'asc' });
    expect(rows.map((r) => r.hex)).toEqual(['LS1', 'LS3', 'LS2']);
  });
});

describe('altitude sort stability', () => {
  it('keeps missing altitude last and ground below numeric altitude in both directions', () => {
    const aGround = ac('GND', { flight: 'G', altitude: 'ground' });
    const aHigh = ac('HI', { flight: 'H', altitude: 30000 });
    const aLow = ac('LO', { flight: 'L', altitude: 5000 });
    const aMissing = ac('MIS', { flight: 'M' });

    const desc = buildRows([aGround, aHigh, aLow, aMissing], {
      ...base,
      sortKey: 'altitude',
      sortDir: 'desc',
    });
    expect(desc.map((r) => r.hex)).toEqual(['HI', 'LO', 'GND', 'MIS']);

    const asc = buildRows([aGround, aHigh, aLow, aMissing], {
      ...base,
      sortKey: 'altitude',
      sortDir: 'asc',
    });
    expect(asc.map((r) => r.hex)).toEqual(['GND', 'LO', 'HI', 'MIS']);
  });
});

describe('buildRows with peakStats', () => {
  it('overrides speed and distance with peak values', () => {
    const a = new Aircraft('aa');
    a.update({ hex: 'aa', lat: 30, lon: 110, speed: 100 }, 1000);
    const peakStats = new Map<string, PeakStats>([['aa', { maxSpeed: 300, maxDist: 50 }]]);
    const rows = buildRows(
      [a],
      {
        query: '',
        filter: 'all',
        sortKey: 'speed',
        sortDir: 'desc',
        inViewOnly: false,
        extent: null,
      },
      peakStats,
    );
    expect(rows[0].speed).toBe(300);
    expect(rows[0].distance).toBe(50);
  });
});

describe('toRow route integration', () => {
  beforeEach(() => {
    routeService.clear();
  });

  it('returns empty route for newly enqueued callsign before flush', async () => {
    routeService.enqueue('CCA1234');
    const a1 = ac('abc123', { flight: 'CCA1234', lat: 39.9, lon: 116.4 });
    const row = toRow(a1, undefined, true);
    expect(row.route).toBe('');
  });

  it('returns empty route when routeApiEnabled is false', async () => {
    await seedRoute('CCA1234', 'PEK - SHA');
    const a1 = ac('abc123', { flight: 'CCA1234', lat: 39.9, lon: 116.4 });
    const row = toRow(a1, undefined, false);
    expect(row.route).toBe('');
  });

  it('returns cached route when routeApiEnabled is true and cache has value', async () => {
    await seedRoute('CCA1234', 'PEK - SHA');
    const a1 = ac('abc123', { flight: 'CCA1234', lat: 39.9, lon: 116.4 });
    const row = toRow(a1, undefined, true);
    expect(row.route).toBe('PEK - SHA');
  });

  it('returns empty route when routeApiEnabled is true but no cache entry', () => {
    const a1 = ac('abc123', { flight: 'CCA1234', lat: 39.9, lon: 116.4 });
    const row = toRow(a1, undefined, true);
    expect(row.route).toBe('');
  });

  it('normalizes callsign with whitespace and case before lookup', async () => {
    await seedRoute('CCA1234', 'PEK - SHA');
    const a1 = ac('abc123', { flight: ' cca1234 ', lat: 39.9, lon: 116.4 });
    const row = toRow(a1, undefined, true);
    expect(row.route).toBe('PEK - SHA');
  });

  it('propagates route to buildRows when routeApiEnabled is true', async () => {
    await seedRoute('CCA1234', 'PEK - SHA');
    const fleet = [ac('abc123', { flight: 'CCA1234', lat: 39.9, lon: 116.4, altitude: 10000 })];
    const rows = buildRows(fleet, { ...base, query: '' }, null, true);
    expect(rows[0].route).toBe('PEK - SHA');
  });
});
