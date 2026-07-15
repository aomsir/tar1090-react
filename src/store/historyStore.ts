import { Aircraft } from '@/domain/Aircraft';
import type { AircraftSnapshot } from '@/data/types';
import type { TrackPoint } from '@/features/track/track';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
import { buildDrawablePassIndex } from '@/features/playback/historyTracks';
import {
  hydrateAircraftPasses,
  serializeHistoryStatisticsInput,
} from '@/features/playback/historyPreprocess';
import { historyPreprocessClient } from '@/features/playback/historyPreprocessClient';
import { enrichAircraft } from '@/domain/enrich';
import { routeService } from '@/data/routeService';
import { normalizeCallsign } from '@/domain/callsign';
import { ROUTE_API_URL } from '@/config/api';
import { useLiveTick } from './liveTick';
import { useHistoryStatsStore } from './historyStatsStore';
import type { HistoryPerformanceRecorder } from '@/features/playback/historyPerformance';

export class HistoryStore {
  generation = 0;
  performanceRecorder: { generation: number; recorder: HistoryPerformanceRecorder } | null = null;
  frames: AircraftSnapshot[] = [];
  passes: AircraftPass[] = [];
  drawablePassesRecentFirst: AircraftPass[] = [];
  passTracksData: Map<string, TrackPoint[]> | null = null;
  private passById = new Map<string, AircraftPass>();

  setFrames(frames: AircraftSnapshot[]): void {
    this.generation += 1;
    this.performanceRecorder = null;
    this.frames = [...frames].sort((a, b) => a.now - b.now);
    this.resetPassState();
  }

  reset(): void {
    this.generation += 1;
    this.performanceRecorder = null;
    this.frames = [];
    this.resetPassState();
  }

  getPass(passId: string | null): AircraftPass | null {
    if (!passId) return null;
    return this.passById.get(passId.trim().toLowerCase()) ?? null;
  }

  async buildPassData(
    siteLat?: number,
    siteLon?: number,
    routeApiEnabled = false,
    recorder?: HistoryPerformanceRecorder,
  ): Promise<void> {
    const generation = this.generation;
    const frames = this.frames;
    recorder?.start('passes');
    recorder?.setExecutionPath('worker');
    recorder?.start('preprocess');
    let passes: AircraftPass[];
    let preprocessFallback = false;
    try {
      const preprocessed = await historyPreprocessClient.preprocess(
        generation,
        frames,
        { siteLat, siteLon },
        () => {
          preprocessFallback = true;
          recorder?.setExecutionPath('fallback');
          recorder?.start('preprocessFallback');
        },
      );
      if (generation !== this.generation) return;
      passes = hydrateAircraftPasses(preprocessed.passes);
      this.passes = passes;
      this.drawablePassesRecentFirst = buildDrawablePassIndex(passes);
      this.passTracksData = new Map(passes.map((pass) => [pass.passId, pass.trackPoints]));
      this.passById = new Map(passes.map((pass) => [pass.passId.trim().toLowerCase(), pass]));
      useLiveTick.getState().bump();
    } finally {
      recorder?.end('preprocess');
      recorder?.end('passes');
      if (preprocessFallback) recorder?.end('preprocessFallback');
    }
    if (generation !== this.generation) return;
    recorder?.start('enrichment');
    try {
      await Promise.all(passes.map((pass) => enrichAircraft(pass.aircraft)));
    } finally {
      recorder?.end('enrichment');
    }
    if (generation !== this.generation) return;

    if (routeApiEnabled) {
      const callsigns = new Set<string>();
      for (const pass of passes) {
        const callsign = normalizeCallsign(pass.aircraft.flight ?? '');
        if (callsign) callsigns.add(callsign);
      }
      for (const callsign of callsigns) routeService.enqueue(callsign);
      await routeService.flush(ROUTE_API_URL);
    }
    if (generation !== this.generation) return;

    recorder?.start('statistics');
    let statisticsFallback = false;
    try {
      const input = serializeHistoryStatisticsInput(frames, passes);
      const stats = await historyPreprocessClient.statistics(generation, input, () => {
        statisticsFallback = true;
        recorder?.start('statisticsFallback');
      });
      if (generation !== this.generation) return;
      useHistoryStatsStore.getState().setStats(stats);
      useLiveTick.getState().bump();
    } finally {
      recorder?.end('statistics');
      if (statisticsFallback) recorder?.end('statisticsFallback');
    }
  }

  clearPassData(invalidate = true): void {
    if (invalidate) this.generation += 1;
    if (invalidate) this.performanceRecorder = null;
    this.resetPassState();
  }

  private resetPassState(): void {
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

  frameIndexAt(t: number): number | null {
    const n = this.frames.length;
    if (n === 0) return null;
    if (t <= this.frames[0].now) return 0;
    if (t >= this.frames[n - 1].now) return n - 1;
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
    return best;
  }

  frameAt(t: number): AircraftSnapshot | null {
    const index = this.frameIndexAt(t);
    return index === null ? null : this.frames[index];
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
