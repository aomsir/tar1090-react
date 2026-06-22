import { Aircraft } from '@/domain/Aircraft';
import type { AircraftSnapshot } from '@/data/types';
import type { TrackPoint } from '@/features/track/track';
import type { PeakStats } from '@/features/playback/pTracks';
import { buildPTracks, buildPeakStats, buildAllHistoryAircraft } from '@/features/playback/pTracks';
import { enrichAircraft } from '@/domain/enrich';
import { routeService } from '@/data/routeService';
import { normalizeCallsign } from '@/domain/callsign';
import { ROUTE_API_URL } from '@/config/api';
import { useLiveTick } from './liveTick';

export class HistoryStore {
  frames: AircraftSnapshot[] = [];
  pTracksData: Map<string, TrackPoint[]> | null = null;
  peakStats: Map<string, PeakStats> | null = null;
  allAircraft: Aircraft[] = [];

  setFrames(frames: AircraftSnapshot[]): void {
    this.frames = [...frames].sort((a, b) => a.now - b.now);
  }

  reset(): void {
    this.frames = [];
    this.clearPTracksData();
  }

  async buildPTracksData(siteLat?: number, siteLon?: number, routeApiEnabled = false): Promise<void> {
    this.pTracksData = buildPTracks(this.frames);
    this.peakStats = buildPeakStats(this.frames, siteLat, siteLon);
    this.allAircraft = buildAllHistoryAircraft(this.frames);
    // Enrich all aircraft with registration, type, etc. from the client-side
    // database. History frames from the backend don't contain these fields.
    await Promise.all(this.allAircraft.map((ac) => enrichAircraft(ac)));

    // Fetch route data for history aircraft with callsigns.
    // In live mode this happens inside the polling subscribe callback,
    // but history mode bypasses that path entirely.
    if (routeApiEnabled) {
      for (const ac of this.allAircraft) {
        if (ac.flight) {
          routeService.enqueue(normalizeCallsign(ac.flight));
        }
      }
      await routeService.flush(ROUTE_API_URL);
    }

    // Bump liveTick so useAircraftRows' useMemo invalidates and picks up
    // the enriched type/registration data.
    useLiveTick.getState().bump();
  }

  clearPTracksData(): void {
    this.pTracksData = null;
    this.peakStats = null;
    this.allAircraft = [];
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
