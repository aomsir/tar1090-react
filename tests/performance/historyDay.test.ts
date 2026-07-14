import { describe, expect, it } from 'vitest';
import { HistoryPerformanceRecorder } from '@/features/playback/historyPerformance';
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

    expect(recorder.snapshot()).toEqual({
      phases: {},
      firstMapContentMs: 10,
      fullMapContentMs: 30,
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
    expect(frames.flatMap((frame) => frame.aircraft).some(({ altitude }) => altitude === 'ground')).toBe(
      true,
    );
    expect(frames.flatMap((frame) => frame.aircraft).some(({ altitude }) => altitude === undefined)).toBe(
      true,
    );
    expect(frames.flatMap((frame) => frame.aircraft).some(({ altitude }) => typeof altitude === 'number')).toBe(
      true,
    );
    expect(frames[0].aircraft[1].lat).toBe(frames[1].aircraft[1].lat);
    expect(frames[0].aircraft.some(({ hex }) => hex === '000000')).toBe(true);
    expect(frames[1_920].aircraft.some(({ hex }) => hex === '000000')).toBe(true);
    expect(frames[480].aircraft.some(({ hex }) => hex === '000000')).toBe(false);
  });
});
