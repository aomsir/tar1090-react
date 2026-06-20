import { create } from 'zustand';
import type { AircraftSnapshot } from './types';
import type { TrackPoint } from '@/features/track/track';

type FrameFetcher = (n: number) => Promise<AircraftSnapshot>;

const CONCURRENCY = 240;

interface SeedVersionState {
  version: number;
}

export const useSeedVersion = create<SeedVersionState>(() => ({ version: 0 }));

const seedMap = new Map<string, TrackPoint[]>();

export function getHistorySeed(hex: string): TrackPoint[] | undefined {
  return seedMap.get(hex.toLowerCase());
}

export async function loadLiveHistory(
  getFrame: FrameFetcher,
  historyCount: number,
  maxFrames = 2000,
): Promise<void> {
  if (historyCount <= 0) return;

  const start = Math.max(0, historyCount - maxFrames);
  const total = historyCount - start;
  const indices = Array.from({ length: total }, (_, i) => start + i);

  const frames: Array<AircraftSnapshot | undefined> = new Array(total).fill(undefined);
  let next = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const slot = next++;
      if (slot >= total) return;
      try {
        frames[slot] = await getFrame(indices[slot]!);
      } catch {
        /* skip failed frame */
      }
    }
  };

  const lanes = Math.min(CONCURRENCY, total || 1);
  await Promise.all(Array.from({ length: lanes }, () => worker()));

  const sorted = frames
    .filter((f): f is AircraftSnapshot => f != null)
    .sort((a, b) => a.now - b.now);

  for (const frame of sorted) {
    for (const dto of frame.aircraft ?? []) {
      if (typeof dto.lat !== 'number' || typeof dto.lon !== 'number') continue;
      const hex = dto.hex.toLowerCase();
      let pts = seedMap.get(hex);
      if (!pts) {
        pts = [];
        seedMap.set(hex, pts);
      }
      const last = pts[pts.length - 1];
      if (last && last.lon === dto.lon && last.lat === dto.lat) continue;
      pts.push({
        lon: dto.lon,
        lat: dto.lat,
        alt: dto.altitude,
        ts: frame.now,
        track: dto.track,
        speed: dto.speed,
        ground: dto.altitude === 'ground',
      });
    }
  }

  useSeedVersion.setState({ version: Date.now() });
}

export function clearHistorySeedForTest(): void {
  seedMap.clear();
  useSeedVersion.setState({ version: 0 });
}
