import { Aircraft } from '@/domain/Aircraft';
import type { AircraftSnapshot } from '@/data/types';
import type { TrackPoint } from '@/features/track/track';
import { buildAircraftPasses, type AircraftPass } from '@/features/playback/aircraftPasses';
import { buildDrawablePassIndex } from '@/features/playback/historyTracks';
import { enrichAircraft } from '@/domain/enrich';
import { routeService } from '@/data/routeService';
import { normalizeCallsign } from '@/domain/callsign';
import { ROUTE_API_URL } from '@/config/api';
import { useLiveTick } from './liveTick';
import { computeHistoryStats } from '@/features/stats/historyStats';
import { useHistoryStatsStore } from './historyStatsStore';
import type { HistoryPerformanceRecorder } from '@/features/playback/historyPerformance';

export class HistoryStore {
  generation = 0;
  frames: AircraftSnapshot[] = [];
  passes: AircraftPass[] = [];
  drawablePassesRecentFirst: AircraftPass[] = [];
  passTracksData: Map<string, TrackPoint[]> | null = null;
  private passById = new Map<string, AircraftPass>();

  setFrames(frames: AircraftSnapshot[]): void {
    this.generation += 1;
    this.frames = [...frames].sort((a, b) => a.now - b.now);
  }

  reset(): void {
    this.generation += 1;
    this.frames = [];
    this.clearPassData();
  }

  getPass(passId: string | null): AircraftPass | null {
    if (!passId) return null;
    return this.passById.get(passId) ?? null;
  }

  async buildPassData(
    siteLat?: number,
    siteLon?: number,
    routeApiEnabled = false,
    recorder?: HistoryPerformanceRecorder,
  ): Promise<void> {
    recorder?.start('passes');
    try {
      this.passes = buildAircraftPasses(this.frames, { siteLat, siteLon });
      this.drawablePassesRecentFirst = buildDrawablePassIndex(this.passes);
      this.passTracksData = new Map(this.passes.map((pass) => [pass.passId, pass.trackPoints]));
      this.passById = new Map(this.passes.map((pass) => [pass.passId, pass]));
    } finally {
      recorder?.end('passes');
    }
    recorder?.start('enrichment');
    try {
      await Promise.all(this.passes.map((pass) => enrichAircraft(pass.aircraft)));
    } finally {
      recorder?.end('enrichment');
    }

    if (routeApiEnabled) {
      const callsigns = new Set<string>();
      for (const pass of this.passes) {
        const callsign = normalizeCallsign(pass.aircraft.flight ?? '');
        if (callsign) callsigns.add(callsign);
      }
      for (const callsign of callsigns) routeService.enqueue(callsign);
      await routeService.flush(ROUTE_API_URL);
    }

    recorder?.start('statistics');
    try {
      useHistoryStatsStore.getState().setStats(computeHistoryStats(this.frames, this.passes));
    } finally {
      recorder?.end('statistics');
    }
    useLiveTick.getState().bump();
  }

  clearPassData(): void {
    this.passes = [];
    this.drawablePassesRecentFirst = [];
    this.passTracksData = null;
    this.passById = new Map();
    useHistoryStatsStore.getState().clear();
  }

  /** Median interval between consecutive frames (seconds). */
  frameInterval(): number {
    const n = this.frames.length;
    if (n < 2) return 30;
    const gaps: number[] = [];
    for (let i = 1; i < n; i++) gaps.push(this.frames[i].now - this.frames[i - 1].now);
    gaps.sort((a, b) => a - b);
    return gaps[Math.floor(gaps.length / 2)];
  }

  timeBounds(): { min: number; max: number } | null {
    if (this.frames.length === 0) return null;
    return { min: this.frames[0].now, max: this.frames[this.frames.length - 1].now };
  }

  frameAt(t: number): AircraftSnapshot | null {
    const n = this.frames.length;
    if (n === 0) return null;
    if (t <= this.frames[0].now) return this.frames[0];
    if (t >= this.frames[n - 1].now) return this.frames[n - 1];
    let lo = 0;
    let hi = n - 1;
    let best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.frames[mid].now <= t) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return this.frames[best];
  }

  extractFrameAircraft(t: number): Aircraft[] {
    const f = this.frameAt(t);
    if (!f) return [];
    return (f.aircraft ?? []).map((dto) => {
      const ac = new Aircraft(dto.hex);
      ac.update(dto, f.now);
      return ac;
    });
  }
}

export const historyStore = new HistoryStore();
