import { describe, expect, it } from 'vitest';
import type { AircraftSnapshot } from '@/data/types';
import { Aircraft } from '@/domain/Aircraft';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import { selectHistoryAircraft } from '@/features/playback/historyAircraft';

function frame(now: number, aircraft: Record<string, unknown>[]): AircraftSnapshot {
  return {
    now,
    messages: 0,
    aircraft: aircraft as AircraftSnapshot['aircraft'],
  };
}

function pass(
  hex: string,
  startTime: number,
  endTime: number,
  points: AircraftPass['trackPoints'],
): AircraftPass {
  const aircraft = new Aircraft(hex);
  aircraft.flight = 'DISPLAY';
  aircraft.isMilitary = true;
  return {
    passId: `${hex}:${startTime}`,
    hex,
    startTime,
    endTime,
    aircraft,
    trackPoints: points,
    altitudeSummary: { hasGround: false, hasUnknown: false },
    hadAltitude: false,
    hadGround: false,
    hadEmergency: false,
    hadSquawk: false,
  };
}

describe('selectHistoryAircraft', () => {
  it('projects every finite positioned frame aircraft when altitude filtering is disabled', () => {
    const result = selectHistoryAircraft(
      frame(100, [
        { hex: 'first', lat: 10, lon: 20, altitude: 500 },
        { hex: 'second', lat: 11, lon: 21, altitude: 'ground' },
        { hex: 'missing-lat', lon: 22, altitude: 600 },
        { hex: 'bad-lon', lat: 12, lon: Number.NaN, altitude: 700 },
      ]),
    );

    expect(result.map((aircraft) => aircraft.hex)).toEqual(['first', 'second']);
  });

  it('applies closed numeric altitude bounds', () => {
    const result = selectHistoryAircraft(
      frame(100, [
        { hex: 'low', lat: 1, lon: 1, altitude: 999 },
        { hex: 'min', lat: 2, lon: 2, altitude: 1000 },
        { hex: 'max', lat: 3, lon: 3, altitude: 2000 },
        { hex: 'high', lat: 4, lon: 4, altitude: 2001 },
      ]),
      { altitudeRange: { min: 1000, max: 2000 } },
    );

    expect(result.map((aircraft) => aircraft.hex)).toEqual(['min', 'max']);
  });

  it('treats ground altitude as zero', () => {
    const result = selectHistoryAircraft(
      frame(100, [{ hex: 'ground', lat: 5, lon: 5, altitude: 'ground' }]),
      { altitudeRange: { min: 0, max: 0 } },
    );

    expect(result.map((aircraft) => aircraft.hex)).toEqual(['ground']);
  });

  it('hides unselected unknown or non-finite altitude when altitude filtering is enabled', () => {
    const result = selectHistoryAircraft(
      frame(100, [
        { hex: 'missing', lat: 1, lon: 1 },
        { hex: 'nan', lat: 2, lon: 2, altitude: Number.NaN },
        { hex: 'infinite', lat: 3, lon: 3, altitude: Number.POSITIVE_INFINITY },
      ]),
      { altitudeRange: { min: 0, max: 2000 } },
    );

    expect(result).toEqual([]);
  });

  it('keeps the selected frame aircraft regardless of its unknown altitude', () => {
    const result = selectHistoryAircraft(
      frame(100, [
        { hex: 'selected', lat: 1, lon: 1 },
        { hex: 'other', lat: 2, lon: 2 },
      ]),
      { selectedHex: 'selected', altitudeRange: { min: 0, max: 2000 } },
    );

    expect(result.map((aircraft) => aircraft.hex)).toEqual(['selected']);
  });

  it('normalizes frame, selection, isolation, and pass hex values before filtering', () => {
    const selectedPass = pass('abc123', 100, 200, []);
    const result = selectHistoryAircraft(
      frame(100, [
        { hex: ' ABC123 ', lat: 1, lon: 1 },
        { hex: 'DEF456', lat: 2, lon: 2, altitude: 1000 },
      ]),
      {
        selectedHex: ' abc123 ',
        selectedHexes: new Set([' ABC123 ']),
        selectedPass,
        passes: [selectedPass],
        cursorTime: 100,
        isolation: true,
        altitudeRange: { min: 0, max: 2000 },
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ hex: 'abc123', flight: 'DISPLAY', isMilitary: true });
  });

  it('uses normalized pass metadata for the military filter', () => {
    const militaryPass = pass('abc123', 100, 200, []);
    const result = selectHistoryAircraft(
      frame(100, [{ hex: ' ABC123 ', lat: 1, lon: 1, altitude: 1000 }]),
      { onlyMilitary: true, passes: [militaryPass], cursorTime: 100 },
    );

    expect(result.map((aircraft) => aircraft.hex)).toEqual(['abc123']);
  });

  it('normalizes the selected fallback marker hex from pass metadata', () => {
    const selectedPass = pass(' ABC123 ', 100, 200, [
      { lon: 10, lat: 20, alt: 1000, ts: 100, ground: false },
    ]);

    const result = selectHistoryAircraft(frame(150, []), {
      selectedHex: 'abc123',
      selectedPass,
      cursorTime: 150,
    });

    expect(result).toHaveLength(1);
    expect(result[0].hex).toBe('abc123');
  });

  it('keeps the selected aircraft subject to existing non-altitude filters', () => {
    const selectedPass = pass('selected', 0, 200, []);
    const result = selectHistoryAircraft(
      frame(100, [
        { hex: 'selected', lat: 1, lon: 1, altitude: 5000, category: 'C1' },
        { hex: 'military', lat: 2, lon: 2, altitude: 1000 },
        { hex: '~mlat', lat: 3, lon: 3, altitude: 1000 },
      ]),
      {
        selectedHex: 'selected',
        selectedPass,
        onlyMilitary: true,
        filterGroundVehicles: true,
        filterBlockedMLAT: true,
        altitudeRange: { min: 0, max: 2000 },
      },
    );

    expect(result).toEqual([]);
  });

  it('uses the selected pass latest real point at or before the cursor when absent from the frame', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 100, ts: 100, ground: false },
      { lon: 11, lat: 21, alt: 200, ts: 150, track: 90, speed: 300, ground: false },
      { lon: 12, lat: 22, alt: 300, ts: 200, ground: false },
    ]);

    const result = selectHistoryAircraft(frame(160, []), {
      selectedHex: 'selected',
      selectedPass,
      cursorTime: 160,
      altitudeRange: { min: 1000, max: 2000 },
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      hex: 'selected',
      flight: 'DISPLAY',
      isMilitary: true,
      lon: 11,
      lat: 21,
      altitude: 200,
      track: 90,
      speed: 300,
    });
  });

  it('uses the last positioned duplicate timestamp point at or before the cursor', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 100, ts: 100, ground: false },
      { lon: Number.NaN, lat: 21, alt: 200, ts: 150, ground: false },
      { lon: 12, lat: 22, alt: 300, ts: 150, ground: false },
      { lon: 13, lat: 23, alt: 400, ts: 200, ground: false },
    ]);

    const result = selectHistoryAircraft(frame(150, []), {
      selectedHex: 'selected',
      selectedPass,
      cursorTime: 150,
    });

    expect(result[0]).toMatchObject({ lon: 12, lat: 22, altitude: 300 });
  });

  it('does not use a selected fallback point before the first timestamp', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 100, ts: 110, ground: false },
    ]);

    expect(
      selectHistoryAircraft(frame(100, []), {
        selectedHex: 'selected',
        selectedPass,
        cursorTime: 100,
      }),
    ).toEqual([]);
  });

  it('does not synthesize a selected marker outside its pass or without an eligible positioned point', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 100, ts: 100, ground: false },
    ]);

    expect(
      selectHistoryAircraft(frame(50, []), {
        selectedHex: 'selected',
        selectedPass,
        cursorTime: 50,
      }),
    ).toEqual([]);
    expect(
      selectHistoryAircraft(frame(150, []), {
        selectedHex: 'selected',
        selectedPass: pass('selected', 100, 200, [
          { lon: Number.NaN, lat: 20, alt: 100, ts: 100, ground: false },
        ]),
        cursorTime: 150,
      }),
    ).toEqual([]);
  });

  it('uses the frame position instead of a selected pass fallback when the selected aircraft is present', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 100, ts: 100, ground: false },
    ]);

    const result = selectHistoryAircraft(
      frame(150, [{ hex: 'selected', lat: 30, lon: 40, altitude: 500 }]),
      { selectedHex: 'selected', selectedPass, cursorTime: 150 },
    );

    expect(result[0]).toMatchObject({ lon: 40, lat: 30, altitude: 500 });
  });

  it('does not mutate canonical pass position history while projecting marker metadata', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 100, ts: 100, ground: false },
    ]);

    selectHistoryAircraft(frame(150, [{ hex: 'selected', lat: 30, lon: 40, altitude: 500 }]), {
      selectedHex: 'selected',
      selectedPass,
      passes: [selectedPass],
      cursorTime: 150,
    });
    selectHistoryAircraft(frame(150, []), {
      selectedHex: 'selected',
      selectedPass,
      cursorTime: 150,
    });

    expect(selectedPass.aircraft.positionHistory).toEqual([]);
  });
});
