import { create } from 'zustand';
import type { LiveStats } from './aircraftStore';

interface StatsState extends LiveStats {
  setStats: (stats: LiveStats) => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  count: 0,
  messages: 0,
  messageRate: 0,
  now: 0,
  setStats: (stats) => set(stats),
}));
