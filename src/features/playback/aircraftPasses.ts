import type { AircraftSnapshot } from '@/data/types';
import type { Aircraft } from '@/domain/Aircraft';
import type { TrackPoint } from '@/features/track/track';
import { type TrackAltitudeSummary } from './altitudeTracks';
import { hydrateAircraftPasses, preprocessHistoryFrames } from './historyPreprocess';

export const AIRCRAFT_PASS_ISOLATION_SECONDS = 12 * 60 * 60;

export interface AircraftPass {
  passId: string;
  hex: string;
  startTime: number;
  endTime: number;
  aircraft: Aircraft;
  trackPoints: TrackPoint[];
  altitudeSummary: TrackAltitudeSummary;
  maxAltitude?: number;
  maxSpeed?: number;
  maxDistance?: number;
  hadAltitude: boolean;
  hadGround: boolean;
  hadEmergency: boolean;
  hadSquawk: boolean;
}

export interface BuildAircraftPassesOptions {
  isolationSeconds?: number;
  siteLat?: number;
  siteLon?: number;
}

export function buildAircraftPasses(
  frames: AircraftSnapshot[],
  options: BuildAircraftPassesOptions = {},
): AircraftPass[] {
  return hydrateAircraftPasses(preprocessHistoryFrames(frames, options).passes);
}
