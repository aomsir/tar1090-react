import type { AircraftSnapshot } from '@/data/types';

const FRAME_COUNT = 2_880;
const PASS_GAP_START = 480;
const PASS_GAP_END = 1_920;

export function buildHistoryDayFixture(aircraftPerFrame = 80): AircraftSnapshot[] {
  return Array.from({ length: FRAME_COUNT }, (_, frameIndex) => ({
    now: 1_700_000_000 + frameIndex * 30,
    messages: frameIndex * aircraftPerFrame,
    aircraft: Array.from({ length: aircraftPerFrame }, (_, aircraftIndex) => {
      const phase = (frameIndex + aircraftIndex) % 90;
      const isSplitPassAircraft = aircraftIndex === 0;
      const inPassGap =
        isSplitPassAircraft && frameIndex >= PASS_GAP_START && frameIndex < PASS_GAP_END;
      return {
        hex: aircraftIndex.toString(16).padStart(6, '0'),
        flight: `T${aircraftIndex.toString().padStart(3, '0')}`,
        lat: inPassGap
          ? undefined
          : 30 + aircraftIndex * 0.002 + Math.floor(frameIndex / 2) * 0.00001,
        lon: inPassGap
          ? undefined
          : 110 + aircraftIndex * 0.002 + Math.floor(frameIndex / 2) * 0.00001,
        altitude: phase === 0 ? 'ground' : phase === 1 ? undefined : phase * 500,
        track: (frameIndex + aircraftIndex) % 360,
        speed: 120 + (aircraftIndex % 40),
      };
    }).filter(
      ({ hex }) => !(hex === '000000' && frameIndex >= PASS_GAP_START && frameIndex < PASS_GAP_END),
    ),
  }));
}
