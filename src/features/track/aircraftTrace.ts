import { apiUrl, withCacheBust } from '@/config/api';
import type { RawAltitude } from '@/data/types';
import type { TrackPoint } from './track';

export type TraceKind = 'full' | 'recent';

type TraceEntry = unknown[];

interface TraceResponse {
  timestamp?: number;
  trace?: TraceEntry[];
}

const traceCache = new Map<string, Promise<TrackPoint[]> | TrackPoint[]>();

const normalizeHex = (hex: string): string => hex.toLowerCase();

const isRawAltitude = (value: unknown): value is RawAltitude =>
  typeof value === 'number' || value === 'ground';

export function traceFilePath(hex: string, kind: TraceKind): string {
  const normalized = normalizeHex(hex);
  const bucket = normalized.slice(-2);
  return `/data/traces/${bucket}/trace_${kind}_${normalized}.json`;
}

export function parseTraceResponse(data: unknown): TrackPoint[] {
  const response = data as TraceResponse | null;
  if (!response || !Array.isArray(response.trace)) return [];

  const base = typeof response.timestamp === 'number' ? response.timestamp : 0;
  const points: TrackPoint[] = [];

  for (const entry of response.trace) {
    const offset = entry[0];
    const lat = entry[1];
    const lon = entry[2];
    if (typeof offset !== 'number' || typeof lat !== 'number' || typeof lon !== 'number') continue;

    const altValue = entry[3];
    const speed = entry[4];
    const track = entry[5];
    const alt = isRawAltitude(altValue) ? altValue : undefined;

    points.push({
      ts: base + offset,
      lat,
      lon,
      alt,
      speed: typeof speed === 'number' ? speed : undefined,
      track: typeof track === 'number' ? track : undefined,
      ground: alt === 'ground',
    });
  }

  return points;
}

export function mergeTracePoints(points: TrackPoint[]): TrackPoint[] {
  const sorted = [...points].sort((a, b) => a.ts - b.ts || a.lon - b.lon || a.lat - b.lat);
  const merged: TrackPoint[] = [];

  for (const point of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.ts === point.ts && last.lon === point.lon && last.lat === point.lat) continue;
    merged.push(point);
  }

  return merged;
}

async function fetchTracePart(
  hex: string,
  kind: TraceKind,
  fetchFn: typeof fetch,
): Promise<TrackPoint[]> {
  try {
    const res = await fetchFn(apiUrl(withCacheBust(traceFilePath(hex, kind))));
    if (!res.ok) return [];
    return parseTraceResponse(await res.json());
  } catch {
    return [];
  }
}

export async function loadAircraftTrace(
  hex: string,
  fetchFn: typeof fetch = (...args: Parameters<typeof fetch>) => fetch(...args),
): Promise<TrackPoint[]> {
  const normalized = normalizeHex(hex);
  const cached = traceCache.get(normalized);
  if (cached) return cached;

  const promise = (async () => {
    const [full, recent] = await Promise.all([
      fetchTracePart(normalized, 'full', fetchFn),
      fetchTracePart(normalized, 'recent', fetchFn),
    ]);
    return mergeTracePoints([...full, ...recent]);
  })();

  traceCache.set(normalized, promise);
  const points = await promise;
  traceCache.set(normalized, points);
  return points;
}

export function clearAircraftTraceCacheForTest(): void {
  traceCache.clear();
}
