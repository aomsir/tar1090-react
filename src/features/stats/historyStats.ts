import type { AircraftSnapshot } from '@/data/types';
import type { Aircraft } from '@/domain/Aircraft';
import type { PeakStats } from '@/features/playback/pTracks';

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
  totalAircraft: number;
  uniqueCallsigns: number;
  militaryCount: number;
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

const MAX_TRAFFIC_TIMELINE_POINTS = 200;

function isEmergency(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== 'none' && normalized !== 'no emergency';
}

function downsampleTimeline(
  points: { time: number; count: number }[],
): { time: number; count: number }[] {
  if (points.length <= MAX_TRAFFIC_TIMELINE_POINTS) return points;
  const bucketSize = Math.ceil(points.length / MAX_TRAFFIC_TIMELINE_POINTS);
  const sampled: { time: number; count: number }[] = [];
  const lastOriginalTime = points[points.length - 1].time;
  for (let start = 0; start < points.length; start += bucketSize) {
    const bucket = points.slice(start, start + bucketSize);
    let max = bucket[0].count;
    for (let i = 1; i < bucket.length; i++) {
      if (bucket[i].count > max) max = bucket[i].count;
    }
    const isLastBucket = start + bucketSize >= points.length;
    const time = isLastBucket ? lastOriginalTime : bucket[0].time;
    sampled.push({ time, count: max });
  }
  return sampled;
}

function topN(map: Map<string, number>, n: number): { name: string; count: number }[] {
  const entries = Array.from(map.entries())
    .filter(([name]) => name !== '')
    .sort((a, b) => b[1] - a[1]);
  return entries.slice(0, n).map(([name, count]) => ({ name, count }));
}

function extractAirlineCode(flight: string): string | null {
  const match = flight
    .trim()
    .toUpperCase()
    .match(/^([A-Z]+)/);
  return match ? match[1] : null;
}

function classifySource(addrType: string | undefined): string {
  switch (addrType) {
    case 'uat':
      return 'UAT';
    case 'mlat':
      return 'MLAT';
    case 'adsb':
    case 'adsb_icao':
    case 'adsb_other':
      return 'ADS-B';
    case 'adsb_icao_nt':
      return 'ADS-B';
    case 'adsr':
    case 'adsr_icao':
    case 'adsr_other':
      return 'ADS-R';
    case 'tisb_icao':
    case 'tisb_trackfile':
    case 'tisb_other':
    case 'tisb':
      return 'TIS-B';
    case 'modeS':
    case 'mode_s':
      return 'Mode S';
    default:
      return 'Other';
  }
}

function altitudeBinLabel(alt: number | 'ground' | undefined): string | null {
  if (alt === 'ground') return 'Ground';
  if (typeof alt !== 'number') return null;
  if (alt < 0) return 'Ground';
  if (alt >= 40000) return '40k+';
  const lower = Math.floor(alt / 5000) * 5;
  const upper = lower + 5;
  return `${lower}-${upper}k`;
}

const ALTITUDE_BIN_ORDER = [
  'Ground',
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

function buildHistogram(
  values: number[],
  edges: number[],
  suffix: string,
): { range: string; count: number }[] {
  const counts = new Array(edges.length).fill(0);
  for (const v of values) {
    let placed = false;
    for (let i = edges.length - 1; i >= 1; i--) {
      if (v >= edges[i]) {
        counts[i] = (counts[i] || 0) + 1;
        placed = true;
        break;
      }
    }
    if (!placed) counts[0]++;
  }
  return edges
    .map((e, i) => {
      const label = i === edges.length - 1 ? `${e}${suffix}+` : `${e}-${edges[i + 1]}${suffix}`;
      return { range: label, count: counts[i] };
    })
    .filter((b) => b.count > 0);
}

export function computeHistoryStats(
  frames: AircraftSnapshot[],
  allAircraft: Aircraft[],
  peakStats: Map<string, PeakStats> | null,
): HistoryStatistics {
  const totalAircraft = allAircraft.length;
  const callsigns = new Set<string>();
  let militaryCount = 0;

  const typeMap = new Map<string, number>();
  const airlineMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const altBinMap = new Map<string, number>();

  let identifiedAny = 0;
  let identifiedCallsign = 0;
  let identifiedType = 0;
  let identifiedRegistration = 0;
  let positionedPosition = 0;
  let positionedSpeed = 0;
  let positionedAltitude = 0;
  let statusGround = 0;
  let statusEmergency = 0;
  let statusSquawk = 0;

  for (const ac of allAircraft) {
    if (ac.flight) callsigns.add(ac.flight);
    if (ac.isMilitary) militaryCount++;

    if (ac.typeCode) {
      typeMap.set(ac.typeCode, (typeMap.get(ac.typeCode) ?? 0) + 1);
    }

    if (ac.flight) {
      const code = extractAirlineCode(ac.flight);
      if (code) airlineMap.set(code, (airlineMap.get(code) ?? 0) + 1);
    }

    if (ac.country) {
      countryMap.set(ac.country, (countryMap.get(ac.country) ?? 0) + 1);
    }

    const src = classifySource(ac.addrType);
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);

    const binLabel = altitudeBinLabel(ac.altitude);
    if (binLabel) {
      altBinMap.set(binLabel, (altBinMap.get(binLabel) ?? 0) + 1);
    }

    const hasCallsign = Boolean(ac.flight);
    const hasType = Boolean(ac.typeCode);
    const hasRegistration = Boolean(ac.registration);
    if (hasCallsign) identifiedCallsign++;
    if (hasType) identifiedType++;
    if (hasRegistration) identifiedRegistration++;
    if (hasCallsign || hasType || hasRegistration) identifiedAny++;

    if (ac.hasPosition()) positionedPosition++;
    if (ac.speed !== undefined) positionedSpeed++;
    if (ac.altitude !== undefined) positionedAltitude++;

    if (ac.altitude === 'ground') statusGround++;
    if (isEmergency(ac.emergency)) statusEmergency++;
    if (ac.squawk && ac.squawk.trim() !== '') statusSquawk++;
  }

  const altitudeBins = ALTITUDE_BIN_ORDER.filter((label) => altBinMap.has(label)).map((label) => ({
    range: label,
    count: altBinMap.get(label)!,
  }));

  const speeds: number[] = [];
  const distances: number[] = [];
  if (peakStats) {
    for (const ps of peakStats.values()) {
      if (ps.maxSpeed !== undefined) speeds.push(ps.maxSpeed);
      if (ps.maxDist !== undefined) distances.push(ps.maxDist);
    }
  }

  let peakOnline = 0;
  let peakTime = 0;
  const trafficTimeline: { time: number; count: number }[] = [];
  for (const f of frames) {
    const count = (f.aircraft ?? []).length;
    if (count > peakOnline) {
      peakOnline = count;
      peakTime = f.now;
    }
    trafficTimeline.push({ time: f.now, count });
  }

  return {
    totalAircraft,
    uniqueCallsigns: callsigns.size,
    militaryCount,
    peakOnline,
    peakTime,
    typeDistribution: topN(typeMap, 20),
    airlineDistribution: topN(airlineMap, 20),
    countryDistribution: topN(countryMap, 15),
    sourceDistribution: topN(sourceMap, 20),
    altitudeBins,
    speedBins: buildHistogram(speeds, SPEED_BINS, ''),
    distanceBins: buildHistogram(distances, DISTANCE_BINS, ''),
    trafficTimeline: downsampleTimeline(trafficTimeline),
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
      status: {
        ground: statusGround,
        emergency: statusEmergency,
        squawk: statusSquawk,
      },
    },
  };
}
