import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStatsStore } from '@/store/historyStatsStore';
import type { HistoryStatistics } from '@/features/stats/historyStats';

const mockStats: HistoryStatistics = {
  totalAircraft: 5,
  uniqueCallsigns: 4,
  militaryCount: 1,
  peakOnline: 3,
  peakTime: 1000,
  typeDistribution: [{ name: 'B738', count: 3 }],
  airlineDistribution: [{ name: 'CCA', count: 2 }],
  countryDistribution: [{ name: 'China', count: 4 }],
  sourceDistribution: [{ name: 'ADS-B', count: 5 }],
  altitudeBins: [{ range: '30-35k', count: 2 }],
  speedBins: [{ range: '400-450', count: 2 }],
  distanceBins: [{ range: '50-75', count: 1 }],
  trafficTimeline: [{ time: 1000, count: 3 }],
};

describe('historyStatsStore', () => {
  beforeEach(() => useHistoryStatsStore.getState().clear());

  it('starts with null stats', () => {
    expect(useHistoryStatsStore.getState().stats).toBeNull();
  });

  it('setStats stores the value', () => {
    useHistoryStatsStore.getState().setStats(mockStats);
    expect(useHistoryStatsStore.getState().stats).toEqual(mockStats);
  });

  it('clear resets to null', () => {
    useHistoryStatsStore.getState().setStats(mockStats);
    useHistoryStatsStore.getState().clear();
    expect(useHistoryStatsStore.getState().stats).toBeNull();
  });
});
