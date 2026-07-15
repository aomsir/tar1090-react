import type { AircraftSnapshot } from '@/data/types';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import {
  computeHistoryStatisticsDTO,
  serializeHistoryStatisticsInput,
} from '@/features/playback/historyPreprocess';

export interface OtherStats {
  identified: {
    any: number;
    callsign: number;
    type: number;
    registration: number;
  };
  positioned: {
    position: number;
    speed: number;
    altitude: number;
  };
  status: {
    ground: number;
    emergency: number;
    squawk: number;
  };
}

export interface HistoryStatistics {
  totalPasses: number;
  uniqueAircraft: number;
  uniqueCallsigns: number;
  militaryPasses: number;
  peakOnline: number;
  peakTime: number;

  typeDistribution: { name: string; count: number }[];
  airlineDistribution: { name: string; count: number }[];
  countryDistribution: { name: string; count: number }[];
  sourceDistribution: { name: string; count: number }[];

  altitudeBins: { range: string; count: number }[];
  speedBins: { range: string; count: number }[];
  distanceBins: { range: string; count: number }[];

  trafficTimeline: { time: number; count: number }[];
  otherStats: OtherStats;
}

export function computeHistoryStats(
  frames: AircraftSnapshot[],
  passes: AircraftPass[],
): HistoryStatistics {
  return computeHistoryStatisticsDTO(serializeHistoryStatisticsInput(frames, passes));
}
