import type { AircraftDTO, AircraftSnapshot } from '@/data/types';
import { Aircraft } from '@/domain/Aircraft';
import { findCountry, flagPath } from '@/domain/country';
import { distanceNm } from '@/domain/distance';
import type { AircraftPass, BuildAircraftPassesOptions } from './aircraftPasses';
import { summarizeTrackAltitude, type TrackAltitudeSummary } from './altitudeTracks';
import type { TrackPoint } from '@/features/track/track';
import type { HistoryStatistics } from '@/features/stats/historyStats';

const AIRCRAFT_PASS_ISOLATION_SECONDS = 12 * 60 * 60;
const ALTITUDE_BIN_ORDER = [
  '0-5k',
  '5-10k',
  '10-15k',
  '15-20k',
  '20-25k',
  '25-30k',
  '30-35k',
  '35-40k',
  '40k+',
];
const SPEED_BINS = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
const DISTANCE_BINS = [0, 25, 50, 75, 100, 125, 150, 175, 200];
const MAX_TRAFFIC_TIMELINE_POINTS = 200;

export interface AircraftPassDTO {
  passId: string;
  hex: string;
  startTime: number;
  endTime: number;
  latestAircraft: AircraftDTO;
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

export interface PreprocessedHistory {
  passes: AircraftPassDTO[];
}

export interface HistoryStatisticsInputDTO {
  frames: Array<{ now: number; aircraftCount: number }>;
  passes: Array<{
    hex: string;
    flight?: string;
    typeCode?: string;
    registration?: string;
    country?: string;
    addrType?: string;
    isMilitary: boolean;
    maxAltitude?: number;
    maxSpeed?: number;
    maxDistance?: number;
    pointCount: number;
    hadAltitude: boolean;
    hadGround: boolean;
    hadEmergency: boolean;
    hadSquawk: boolean;
  }>;
}

function normalizeHex(hex: unknown): string | undefined {
  if (typeof hex !== 'string') return undefined;
  const normalized = hex.trim().toLowerCase();
  return normalized || undefined;
}

function updatePeak(current: number | undefined, value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return current;
  return current === undefined ? value : Math.max(current, value);
}

function mergeLatestAircraft(current: AircraftDTO, next: AircraftDTO, hex: string): AircraftDTO {
  const merged: AircraftDTO = { ...current, hex };
  for (const [key, value] of Object.entries(next)) {
    if (value != null) (merged as unknown as Record<string, unknown>)[key] = value;
  }
  return merged;
}

export function preprocessHistoryFrames(
  frames: readonly AircraftSnapshot[],
  options: BuildAircraftPassesOptions = {},
): PreprocessedHistory {
  const isolationSeconds = Number.isFinite(options.isolationSeconds)
    ? options.isolationSeconds!
    : AIRCRAFT_PASS_ISOLATION_SECONDS;
  const active = new Map<string, { pass: AircraftPassDTO; lastSeen: number; addrType?: string }>();
  const passes: AircraftPassDTO[] = [];
  const sortedFrames = frames
    .filter((frame) => Number.isFinite(frame.now))
    .slice()
    .sort((a, b) => a.now - b.now);

  for (const frame of sortedFrames) {
    for (const dto of frame.aircraft ?? []) {
      const hex = normalizeHex(dto.hex);
      if (!hex) continue;

      let entry = active.get(hex);
      if (!entry || frame.now - entry.lastSeen >= isolationSeconds) {
        const pass: AircraftPassDTO = {
          passId: `${hex}:${frame.now}`,
          hex,
          startTime: frame.now,
          endTime: frame.now,
          latestAircraft: { hex },
          trackPoints: [],
          altitudeSummary: { hasGround: false, hasUnknown: false },
          hadAltitude: false,
          hadGround: false,
          hadEmergency: false,
          hadSquawk: false,
        };
        passes.push(pass);
        entry = { pass, lastSeen: frame.now };
        active.set(hex, entry);
      }

      const pass = entry.pass;
      pass.endTime = frame.now;
      entry.lastSeen = frame.now;
      pass.latestAircraft = mergeLatestAircraft(pass.latestAircraft, dto, hex);
      const rawType = dto.type ?? dto.addrtype;
      const sourceType =
        Array.isArray(dto.mlat) && dto.mlat.includes('lat')
          ? 'mlat'
          : (rawType ?? (dto.lat != null && dto.lon != null ? 'adsb' : undefined));
      if (sourceType !== undefined) entry.addrType = sourceType;
      delete (pass.latestAircraft as unknown as Record<string, unknown>).type;
      if (entry.addrType !== undefined) pass.latestAircraft.addrtype = entry.addrType;
      else delete (pass.latestAircraft as unknown as Record<string, unknown>).addrtype;
      if (Array.isArray(dto.mlat)) pass.latestAircraft.mlat = [...dto.mlat];
      else delete (pass.latestAircraft as unknown as Record<string, unknown>).mlat;

      if (dto.altitude === 'ground') {
        pass.hadAltitude = true;
        pass.hadGround = true;
      } else {
        pass.maxAltitude = updatePeak(pass.maxAltitude, dto.altitude);
        if (typeof dto.altitude === 'number' && Number.isFinite(dto.altitude))
          pass.hadAltitude = true;
      }
      pass.maxSpeed = updatePeak(pass.maxSpeed, dto.speed);

      if (
        typeof dto.lat === 'number' &&
        Number.isFinite(dto.lat) &&
        typeof dto.lon === 'number' &&
        Number.isFinite(dto.lon)
      ) {
        const last = pass.trackPoints[pass.trackPoints.length - 1];
        if (!last || last.lat !== dto.lat || last.lon !== dto.lon) {
          pass.trackPoints.push({
            lon: dto.lon,
            lat: dto.lat,
            alt: dto.altitude,
            ts: frame.now,
            track: dto.track,
            speed: dto.speed,
            ground: dto.altitude === 'ground',
          });
        }
        pass.maxDistance = updatePeak(
          pass.maxDistance,
          distanceNm(options.siteLat, options.siteLon, dto.lat, dto.lon),
        );
      }

      const emergency = typeof dto.emergency === 'string' ? dto.emergency.trim().toLowerCase() : '';
      if (emergency && emergency !== 'none' && emergency !== 'no emergency')
        pass.hadEmergency = true;
      if (typeof dto.squawk === 'string' && dto.squawk.trim()) pass.hadSquawk = true;
    }
  }

  for (const pass of passes) pass.altitudeSummary = summarizeTrackAltitude(pass.trackPoints);
  return { passes: passes.sort((a, b) => a.startTime - b.startTime || a.hex.localeCompare(b.hex)) };
}

export function hydrateAircraftPasses(passes: readonly AircraftPassDTO[]): AircraftPass[] {
  return passes.map((pass) => {
    const aircraft = new Aircraft(pass.hex);
    aircraft.update({ ...pass.latestAircraft }, pass.endTime);
    const country = findCountry(pass.hex);
    aircraft.country = country.country;
    aircraft.flagPath = flagPath(country.country_code);
    return {
      passId: pass.passId,
      hex: pass.hex,
      startTime: pass.startTime,
      endTime: pass.endTime,
      aircraft,
      trackPoints: pass.trackPoints.map((point) => ({ ...point })),
      altitudeSummary: { ...pass.altitudeSummary },
      maxAltitude: pass.maxAltitude,
      maxSpeed: pass.maxSpeed,
      maxDistance: pass.maxDistance,
      hadAltitude: pass.hadAltitude,
      hadGround: pass.hadGround,
      hadEmergency: pass.hadEmergency,
      hadSquawk: pass.hadSquawk,
    } as AircraftPass;
  });
}

export function serializeHistoryStatisticsInput(
  frames: readonly AircraftSnapshot[],
  passes: readonly AircraftPass[],
): HistoryStatisticsInputDTO {
  return {
    frames: frames
      .filter((frame) => Number.isFinite(frame.now))
      .map((frame) => ({ now: frame.now, aircraftCount: (frame.aircraft ?? []).length })),
    passes: passes.map((pass) => ({
      hex: pass.hex,
      flight: pass.aircraft.flight,
      typeCode: pass.aircraft.typeCode,
      registration: pass.aircraft.registration,
      country: pass.aircraft.country,
      addrType: pass.aircraft.addrType,
      isMilitary: pass.aircraft.isMilitary,
      maxAltitude: pass.maxAltitude,
      maxSpeed: pass.maxSpeed,
      maxDistance: pass.maxDistance,
      pointCount: pass.trackPoints.length,
      hadAltitude: pass.hadAltitude,
      hadGround: pass.hadGround,
      hadEmergency: pass.hadEmergency,
      hadSquawk: pass.hadSquawk,
    })),
  };
}

function rankAll(map: Map<string, number>): { name: string; count: number }[] {
  return Array.from(map.entries())
    .filter(([name]) => name !== '')
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function buildHistogram(
  values: number[],
  edges: number[],
  suffix: string,
): { range: string; count: number }[] {
  const counts = new Array(edges.length).fill(0);
  for (const value of values) {
    let placed = false;
    for (let index = edges.length - 1; index >= 1; index--) {
      if (value >= edges[index]) {
        counts[index]++;
        placed = true;
        break;
      }
    }
    if (!placed) counts[0]++;
  }
  return edges
    .map((edge, index) => ({
      range:
        index === edges.length - 1 ? `${edge}${suffix}+` : `${edge}-${edges[index + 1]}${suffix}`,
      count: counts[index],
    }))
    .filter((bin) => bin.count > 0);
}

function classifySource(addrType: string | undefined): string {
  if (addrType === 'uat') return 'UAT';
  if (addrType === 'mlat') return 'MLAT';
  if (['adsb', 'adsb_icao', 'adsb_other', 'adsb_icao_nt'].includes(addrType ?? '')) return 'ADS-B';
  if (['adsr', 'adsr_icao', 'adsr_other'].includes(addrType ?? '')) return 'ADS-R';
  if (['tisb_icao', 'tisb_trackfile', 'tisb_other', 'tisb'].includes(addrType ?? ''))
    return 'TIS-B';
  if (addrType === 'modeS' || addrType === 'mode_s') return 'Mode S';
  return 'Other';
}

function altitudeBinLabel(altitude: number | undefined): string | null {
  if (typeof altitude !== 'number' || !Number.isFinite(altitude) || altitude < 0) return null;
  if (altitude >= 40000) return '40k+';
  const lower = Math.floor(altitude / 5000) * 5;
  return `${lower}-${lower + 5}k`;
}

function downsampleTimeline(
  points: { time: number; count: number }[],
): { time: number; count: number }[] {
  if (points.length <= MAX_TRAFFIC_TIMELINE_POINTS) return points;
  const bucketSize = Math.ceil(points.length / MAX_TRAFFIC_TIMELINE_POINTS);
  return points.reduce<{ time: number; count: number }[]>((sampled, _, start) => {
    if (start % bucketSize) return sampled;
    const bucket = points.slice(start, start + bucketSize);
    sampled.push({
      time: start + bucketSize >= points.length ? points.at(-1)!.time : bucket[0].time,
      count: Math.max(...bucket.map((point) => point.count)),
    });
    return sampled;
  }, []);
}

export function computeHistoryStatisticsDTO(input: HistoryStatisticsInputDTO): HistoryStatistics {
  const aircraft = new Set<string>();
  const callsigns = new Set<string>();
  const typeMap = new Map<string, number>();
  const airlineMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const altitudeMap = new Map<string, number>();
  const speeds: number[] = [];
  const distances: number[] = [];
  let militaryPasses = 0;
  let identifiedCallsign = 0;
  let identifiedType = 0;
  let identifiedRegistration = 0;
  let identifiedAny = 0;
  let positionedPosition = 0;
  let positionedSpeed = 0;
  let positionedAltitude = 0;
  let statusGround = 0;
  let statusEmergency = 0;
  let statusSquawk = 0;

  for (const pass of input.passes) {
    aircraft.add(pass.hex);
    const callsign = pass.flight?.trim();
    if (callsign) {
      callsigns.add(callsign);
      identifiedCallsign++;
    }
    if (pass.typeCode) {
      typeMap.set(pass.typeCode, (typeMap.get(pass.typeCode) ?? 0) + 1);
      identifiedType++;
    }
    if (pass.registration) identifiedRegistration++;
    if (callsign || pass.typeCode || pass.registration) identifiedAny++;
    if (pass.isMilitary) militaryPasses++;
    const airline = callsign?.toUpperCase().match(/^([A-Z]+)/)?.[1];
    if (airline) airlineMap.set(airline, (airlineMap.get(airline) ?? 0) + 1);
    if (pass.country) countryMap.set(pass.country, (countryMap.get(pass.country) ?? 0) + 1);
    const source = classifySource(pass.addrType);
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
    const altitude = altitudeBinLabel(pass.maxAltitude);
    if (altitude) altitudeMap.set(altitude, (altitudeMap.get(altitude) ?? 0) + 1);
    if (pass.pointCount > 0) positionedPosition++;
    if (pass.maxSpeed !== undefined) {
      positionedSpeed++;
      speeds.push(pass.maxSpeed);
    }
    if (pass.maxDistance !== undefined) distances.push(pass.maxDistance);
    if (pass.hadAltitude) positionedAltitude++;
    if (pass.hadGround) statusGround++;
    if (pass.hadEmergency) statusEmergency++;
    if (pass.hadSquawk) statusSquawk++;
  }

  let peakOnline = 0;
  let peakTime = 0;
  const timeline = input.frames.map((frame) => {
    if (frame.aircraftCount > peakOnline) {
      peakOnline = frame.aircraftCount;
      peakTime = frame.now;
    }
    return { time: frame.now, count: frame.aircraftCount };
  });
  return {
    totalPasses: input.passes.length,
    uniqueAircraft: aircraft.size,
    uniqueCallsigns: callsigns.size,
    militaryPasses,
    peakOnline,
    peakTime,
    typeDistribution: rankAll(typeMap),
    airlineDistribution: rankAll(airlineMap),
    countryDistribution: rankAll(countryMap),
    sourceDistribution: rankAll(sourceMap).slice(0, 20),
    altitudeBins: ALTITUDE_BIN_ORDER.filter((range) => altitudeMap.has(range)).map((range) => ({
      range,
      count: altitudeMap.get(range)!,
    })),
    speedBins: buildHistogram(speeds, SPEED_BINS, ''),
    distanceBins: buildHistogram(distances, DISTANCE_BINS, ''),
    trafficTimeline: downsampleTimeline(timeline),
    otherStats: {
      identified: {
        any: identifiedAny,
        callsign: identifiedCallsign,
        type: identifiedType,
        registration: identifiedRegistration,
      },
      positioned: {
        position: positionedPosition,
        speed: positionedSpeed,
        altitude: positionedAltitude,
      },
      status: { ground: statusGround, emergency: statusEmergency, squawk: statusSquawk },
    },
  };
}
