import { describe, expect, it } from 'vitest';
import { Aircraft } from '@/domain/Aircraft';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import { selectHistoryAircraft } from '@/features/playback/historyAircraft';

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
  it('returns no marker without a selected pass', () => {
    expect(
      selectHistoryAircraft({
        selectedHex: null,
        selectedPass: null,
        cursorTime: 150,
      }),
    ).toEqual([]);
  });

  it('projects only the selected pass latest point at or before the cursor', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 100, ts: 100, ground: false },
      { lon: 11, lat: 21, alt: 200, ts: 150, track: 90, speed: 300, ground: false },
      { lon: 12, lat: 22, alt: 300, ts: 200, ground: false },
    ]);

    const result = selectHistoryAircraft({
      selectedHex: 'selected',
      selectedPass,
      cursorTime: 160,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      hex: 'selected',
      flight: 'DISPLAY',
      lon: 11,
      lat: 21,
      altitude: 200,
      track: 90,
      speed: 300,
    });
  });

  it('preserves MLAT metadata while projecting the selected pass position', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 100, ts: 100, ground: false },
    ]);
    selectedPass.aircraft.isMlat = true;
    selectedPass.aircraft.addrType = 'mlat';

    const [aircraft] = selectHistoryAircraft({
      selectedHex: 'selected',
      selectedPass,
      cursorTime: 150,
    });

    expect(aircraft).toMatchObject({ isMlat: true, addrType: 'mlat', lon: 10, lat: 20 });
    expect(selectedPass.aircraft).toMatchObject({ isMlat: true, addrType: 'mlat' });
  });

  it.each([99, 201])('returns no marker outside the selected pass at cursor %s', (cursorTime) => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 100, ts: 100, ground: false },
    ]);

    expect(selectHistoryAircraft({ selectedHex: 'selected', selectedPass, cursorTime })).toEqual([]);
  });

  it('returns no marker when selection and pass hex values do not match', () => {
    expect(
      selectHistoryAircraft({
        selectedHex: 'other',
        selectedPass: pass('selected', 100, 200, [
          { lon: 10, lat: 20, alt: 100, ts: 100, ground: false },
        ]),
        cursorTime: 150,
      }),
    ).toEqual([]);
  });

  it('keeps the selected marker subject to non-altitude filters', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 5000, ts: 100, ground: false },
    ]);
    selectedPass.aircraft.category = 'C1';

    expect(
      selectHistoryAircraft({
        selectedHex: 'selected',
        selectedPass,
        cursorTime: 150,
        filterGroundVehicles: true,
      }),
    ).toEqual([]);
  });

  it('hides a non-military selected marker when onlyMilitary is enabled', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 1000, ts: 100, ground: false },
    ]);
    selectedPass.aircraft.isMilitary = false;

    expect(
      selectHistoryAircraft({
        selectedHex: 'selected',
        selectedPass,
        cursorTime: 150,
        onlyMilitary: true,
      }),
    ).toEqual([]);
  });

  it('hides a blocked MLAT selected marker when its filter is enabled', () => {
    const selectedPass = pass('~selected', 100, 200, [
      { lon: 10, lat: 20, alt: 1000, ts: 100, ground: false },
    ]);

    expect(
      selectHistoryAircraft({
        selectedHex: '~selected',
        selectedPass,
        cursorTime: 150,
        filterBlockedMLAT: true,
      }),
    ).toEqual([]);
  });

  it('keeps the selected marker regardless of altitude range', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 5000, ts: 100, ground: false },
    ]);

    expect(
      selectHistoryAircraft({
        selectedHex: 'selected',
        selectedPass,
        cursorTime: 150,
        altitudeRange: { min: 0, max: 1000 },
      }),
    ).toHaveLength(1);
  });

  it('normalizes the selected fallback marker hex from pass metadata', () => {
    const selectedPass = pass(' ABC123 ', 100, 200, [
      { lon: 10, lat: 20, alt: 1000, ts: 100, ground: false },
    ]);

    const result = selectHistoryAircraft({
      selectedHex: 'abc123',
      selectedPass,
      cursorTime: 150,
    });

    expect(result).toHaveLength(1);
    expect(result[0].hex).toBe('abc123');
  });

  it('uses the last positioned duplicate timestamp point at or before the cursor', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 100, ts: 100, ground: false },
      { lon: Number.NaN, lat: 21, alt: 200, ts: 150, ground: false },
      { lon: 12, lat: 22, alt: 300, ts: 150, ground: false },
      { lon: 13, lat: 23, alt: 400, ts: 200, ground: false },
    ]);

    const result = selectHistoryAircraft({
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
      selectHistoryAircraft({
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
      selectHistoryAircraft({
        selectedHex: 'selected',
        selectedPass,
        cursorTime: 50,
      }),
    ).toEqual([]);
    expect(
      selectHistoryAircraft({
        selectedHex: 'selected',
        selectedPass: pass('selected', 100, 200, [
          { lon: Number.NaN, lat: 20, alt: 100, ts: 100, ground: false },
        ]),
        cursorTime: 150,
      }),
    ).toEqual([]);
  });

  it('does not mutate canonical pass position history while projecting marker metadata', () => {
    const selectedPass = pass('selected', 100, 200, [
      { lon: 10, lat: 20, alt: 100, ts: 100, ground: false },
    ]);

    selectHistoryAircraft({
      selectedHex: 'selected',
      selectedPass,
      cursorTime: 150,
    });

    expect(selectedPass.aircraft.positionHistory).toEqual([]);
  });
});
