import { Aircraft } from '@/domain/Aircraft';
import type { AircraftSnapshot } from '@/data/types';

export class HistoryStore {
  frames: AircraftSnapshot[] = [];

  setFrames(frames: AircraftSnapshot[]): void {
    this.frames = [...frames].sort((a, b) => a.now - b.now);
  }

  reset(): void {
    this.frames = [];
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
