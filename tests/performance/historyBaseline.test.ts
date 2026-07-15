import { describe, expect, it } from 'vitest';
import { buildAircraftPasses } from '@/features/playback/aircraftPasses';
import { computeHistoryStats } from '@/features/stats/historyStats';
import { buildHistoryDayFixture } from '../fixtures/historyDay';

describe('history day partial post-download baseline', () => {
  it('prints stable pass and statistics timing evidence for a deterministic day', () => {
    const frames = buildHistoryDayFixture();
    const passStartedAt = performance.now();
    const passes = buildAircraftPasses(frames);
    const passBuildDurationMs = performance.now() - passStartedAt;
    const statisticsStartedAt = performance.now();
    const statistics = computeHistoryStats(frames, passes);
    const statisticsDurationMs = performance.now() - statisticsStartedAt;
    const result = {
      frameCount: frames.length,
      aircraftCount: new Set(frames.flatMap((frame) => frame.aircraft.map(({ hex }) => hex))).size,
      passCount: passes.length,
      passBuildDurationMs,
      statisticsDurationMs,
    };

    console.info('[history-performance:partial-post-download]', JSON.stringify(result));

    expect(result.frameCount).toBe(2_880);
    expect(result.aircraftCount).toBeGreaterThan(0);
    expect(result.passCount).toBeGreaterThan(result.aircraftCount);
    expect(statistics.totalPasses).toBe(result.passCount);
  });
});
