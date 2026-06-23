import { create } from 'zustand';
import type { HistoryStatistics } from '@/features/stats/historyStats';

interface HistoryStatsState {
  stats: HistoryStatistics | null;
  setStats: (stats: HistoryStatistics) => void;
  clear: () => void;
}

export const useHistoryStatsStore = create<HistoryStatsState>((set) => ({
  stats: null,
  setStats: (stats) => set({ stats }),
  clear: () => set({ stats: null }),
}));
