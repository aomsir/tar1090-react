import { describe, it, expect } from 'vitest';
import { AircraftStore } from './aircraftStore';
import type { AircraftSnapshot } from '@/data/types';

const snap = (now: number, messages: number, hexes: string[]): AircraftSnapshot => ({
  now,
  messages,
  aircraft: hexes.map((hex) => ({ hex, lat: 1, lon: 2, altitude: 1000 })),
});

describe('AircraftStore', () => {
  it('adds aircraft and reuses the same instance on update', () => {
    const store = new AircraftStore();
    store.applySnapshot(snap(1, 0, ['a', 'b']));
    const first = store.map.get('a');
    store.applySnapshot(snap(2, 0, ['a']));
    expect(store.map.get('a')).toBe(first);
  });

  it('computes message rate from message and time deltas', () => {
    const store = new AircraftStore();
    const s1 = store.applySnapshot(snap(100, 1000, ['a']));
    expect(s1.messageRate).toBe(0);
    const s2 = store.applySnapshot(snap(102, 1400, ['a']));
    expect(s2.messageRate).toBe(200);
    expect(s2.count).toBe(1);
  });

  it('prunes aircraft missing for longer than the stale window', () => {
    const store = new AircraftStore();
    store.applySnapshot(snap(0, 0, ['a', 'b']));
    store.applySnapshot(snap(120, 0, ['a']));
    expect(store.map.has('b')).toBe(false);
    expect(store.map.has('a')).toBe(true);
  });

  it('tolerates a snapshot with no aircraft array', () => {
    const store = new AircraftStore();
    const stats = store.applySnapshot({ now: 1, messages: 0 } as AircraftSnapshot);
    expect(stats.count).toBe(0);
  });

  it('reset clears map and prev state so next messageRate is 0', () => {
    const store = new AircraftStore();
    store.applySnapshot(snap(1, 100, ['a', 'b']));
    store.applySnapshot(snap(2, 200, ['a']));
    expect(store.map.size).toBeGreaterThan(0);
    store.reset();
    expect(store.map.size).toBe(0);
    const stats = store.applySnapshot(snap(3, 300, ['x']));
    expect(stats.messageRate).toBe(0);
  });
});
