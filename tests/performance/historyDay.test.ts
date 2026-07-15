import { describe, expect, it } from 'vitest';
import { HistoryPerformanceRecorder } from '@/features/playback/historyPerformance';
import { historyStore } from '@/store/historyStore';
import {
  HistoryTrackClipCache,
  selectHistoryTrackPaths,
} from '@/features/playback/historyTrackSelection';
import { createPTracksLayer, syncPTracksProgressive } from '@/map/pTracksLayer';
import { buildHistoryDayFixture } from '../fixtures/historyDay';

describe('HistoryPerformanceRecorder', () => {
  it('records named non-overlapping phases and total post-download time', () => {
    let now = 0;
    const recorder = new HistoryPerformanceRecorder(() => now);

    recorder.start('postDownload');
    recorder.start('passes');
    now = 25;
    recorder.end('passes');
    recorder.start('statistics');
    now = 40;
    recorder.end('statistics');
    recorder.end('postDownload');

    expect(recorder.snapshot()).toEqual({
      phases: { passes: 25, statistics: 15, postDownload: 40 },
      firstMapContentMs: undefined,
      fullMapContentMs: undefined,
    });
  });

  it('throws when ending a phase that was not started', () => {
    const recorder = new HistoryPerformanceRecorder(() => 0);

    expect(() => recorder.end('fetch')).toThrow('History phase was not started: fetch');
  });

  it('throws when starting a phase that is already running', () => {
    const recorder = new HistoryPerformanceRecorder(() => 0);

    recorder.start('fetch');

    expect(() => recorder.start('fetch')).toThrow('History phase was already started: fetch');
  });

  it('records the first and final map content only as requested', () => {
    const recorder = new HistoryPerformanceRecorder(() => 0);

    recorder.markFirstMapContent(10);
    recorder.markFirstMapContent(20);
    recorder.markFullMapContent(30);
    recorder.markFullMapContent(40);

    expect(recorder.snapshot()).toEqual({
      phases: {},
      firstMapContentMs: 10,
      fullMapContentMs: 30,
    });
  });

  it('keeps the post-download origin after the phase ends for map timing callbacks', () => {
    let now = 10;
    const recorder = new HistoryPerformanceRecorder(() => now);

    recorder.start('postDownload');
    now = 30;
    recorder.end('postDownload');
    now = 55;

    expect(recorder.elapsedSince('postDownload')).toBe(45);
    expect(recorder.elapsedSince('fetch')).toBeUndefined();
  });

  it('records the fallback execution path when Worker is unavailable', async () => {
    const recorder = new HistoryPerformanceRecorder();
    historyStore.reset();
    historyStore.setFrames(buildHistoryDayFixture().slice(0, 2));

    await historyStore.buildPassData(undefined, undefined, false, recorder);

    expect(recorder.snapshot()).toMatchObject({
      executionPath: 'fallback',
      phases: { preprocess: expect.any(Number) },
    });
  });
});

describe('buildHistoryDayFixture', () => {
  it('builds a deterministic ordered day with altitude variants, duplicate positions, and split passes', () => {
    const frames = buildHistoryDayFixture();

    expect(frames).toHaveLength(2_880);
    expect(frames.every((frame, index) => index === 0 || frames[index - 1].now < frame.now)).toBe(
      true,
    );
    expect(frames[0].aircraft.map(({ hex }) => hex)).toEqual(
      buildHistoryDayFixture()[0].aircraft.map(({ hex }) => hex),
    );
    expect(
      frames.flatMap((frame) => frame.aircraft).some(({ altitude }) => altitude === 'ground'),
    ).toBe(true);
    expect(
      frames.flatMap((frame) => frame.aircraft).some(({ altitude }) => altitude === undefined),
    ).toBe(true);
    expect(
      frames
        .flatMap((frame) => frame.aircraft)
        .some(({ altitude }) => typeof altitude === 'number'),
    ).toBe(true);
    expect(frames[0].aircraft[1].lat).toBe(frames[1].aircraft[1].lat);
    expect(frames[0].aircraft.some(({ hex }) => hex === '000000')).toBe(true);
    expect(frames[1_920].aircraft.some(({ hex }) => hex === '000000')).toBe(true);
    expect(frames[480].aircraft.some(({ hex }) => hex === '000000')).toBe(false);
  });

  it('prints optimized timing evidence with portable phase names', async () => {
    const frames = buildHistoryDayFixture();
    const recorder = new HistoryPerformanceRecorder();
    const clipCache = new HistoryTrackClipCache();
    historyStore.reset();
    historyStore.setFrames(frames);

    recorder.start('postDownload');
    await historyStore.buildPassData(undefined, undefined, false, recorder);
    recorder.start('clip');
    const tracks = selectHistoryTrackPaths(historyStore.drawablePassesRecentFirst, 'all', null, {
      generation: historyStore.generation,
      altitudeRange: { min: 0, max: 60_000 },
      cache: clipCache,
    });
    recorder.end('clip');
    const handle = createPTracksLayer();
    let firstObserved = false;
    let fullObserved = false;
    const job = syncPTracksProgressive(handle.source, tracks, {
      batchSize: 1,
      yieldToMain: async () => {},
      onFirstBatch: () => {
        firstObserved = true;
        recorder.markFirstMapContent(recorder.elapsedSince('postDownload') ?? 0);
      },
      onComplete: () => {
        fullObserved = true;
        recorder.markFullMapContent(recorder.elapsedSince('postDownload') ?? 0);
      },
    });
    expect(firstObserved).toBe(true);
    expect(fullObserved).toBe(false);
    await job.done;
    recorder.end('postDownload');
    const snapshot = recorder.snapshot();
    const result = {
      schema: 'history-day-optimized-v1',
      executionPath: snapshot.executionPath,
      frameCount: frames.length,
      trackCount: tracks.size,
      phases: {
        preprocessMs: snapshot.phases.preprocess ?? null,
        clipMs: snapshot.phases.clip ?? null,
        firstMapContentMs: snapshot.firstMapContentMs ?? null,
        fullMapContentMs: snapshot.fullMapContentMs ?? null,
      },
    };

    console.info('[history-performance:optimized]', JSON.stringify(result));

    expect(result).toMatchObject({
      schema: 'history-day-optimized-v1',
      executionPath: 'fallback',
      frameCount: 2_880,
      trackCount: expect.any(Number),
      phases: {
        preprocessMs: expect.any(Number),
        clipMs: expect.any(Number),
        firstMapContentMs: expect.any(Number),
        fullMapContentMs: expect.any(Number),
      },
    });
    expect(fullObserved).toBe(true);
    expect(result.phases.fullMapContentMs).toBeGreaterThanOrEqual(result.phases.firstMapContentMs!);
    expect(handle.source.getFeatures().length).toBeGreaterThan(0);
  });
});
