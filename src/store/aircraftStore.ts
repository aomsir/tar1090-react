import { Aircraft } from '@/domain/Aircraft';
import type { AircraftSnapshot } from '@/data/types';
import { useToolbarStore } from '@/store/toolbarStore';

const STALE_SECONDS = 60;

export interface LiveStats {
  count: number;
  messages: number;
  messageRate: number;
  now: number;
}

export class AircraftStore {
  readonly map = new Map<string, Aircraft>();
  private prevMessages: number | null = null;
  private prevNow: number | null = null;

  applySnapshot(snap: AircraftSnapshot): LiveStats {
    const list = snap.aircraft ?? [];
    const present = new Set<string>();
    for (const dto of list) {
      present.add(dto.hex);
      let ac = this.map.get(dto.hex);
      if (!ac) {
        ac = new Aircraft(dto.hex);
        this.map.set(dto.hex, ac);
      }
      ac.update(dto, snap.now);
    }
    for (const [hex, ac] of this.map) {
      if (!present.has(hex) && snap.now - ac.lastUpdated > STALE_SECONDS) {
        if (useToolbarStore.getState().persistence) continue;
        this.map.delete(hex);
      }
    }

    let messageRate = 0;
    if (this.prevMessages != null && this.prevNow != null && snap.now > this.prevNow) {
      messageRate = (snap.messages - this.prevMessages) / (snap.now - this.prevNow);
    }
    this.prevMessages = snap.messages;
    this.prevNow = snap.now;

    return { count: this.map.size, messages: snap.messages, messageRate, now: snap.now };
  }

  reset(): void {
    this.map.clear();
    this.prevMessages = null;
    this.prevNow = null;
  }

  list(): Aircraft[] {
    return [...this.map.values()];
  }
}

export const aircraftStore = new AircraftStore();
