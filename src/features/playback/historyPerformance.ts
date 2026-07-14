export type HistoryPhase =
  | 'fetch'
  | 'postDownload'
  | 'passes'
  | 'preprocessFallback'
  | 'enrichment'
  | 'statistics'
  | 'statisticsFallback'
  | 'clip'
  | 'mapFeatures';

export interface HistoryPerformanceSnapshot {
  phases: Partial<Record<HistoryPhase, number>>;
  firstMapContentMs?: number;
  fullMapContentMs?: number;
}

export class HistoryPerformanceRecorder {
  private readonly now: () => number;
  private readonly starts = new Map<HistoryPhase, number>();
  private readonly origins = new Map<HistoryPhase, number>();
  private readonly phases: Partial<Record<HistoryPhase, number>> = {};
  private firstMapContentMs?: number;
  private fullMapContentMs?: number;

  constructor(now: () => number = () => performance.now()) {
    this.now = now;
  }

  start(phase: HistoryPhase): void {
    if (this.starts.has(phase)) throw new Error(`History phase was already started: ${phase}`);
    const started = this.now();
    this.starts.set(phase, started);
    this.origins.set(phase, started);
  }

  end(phase: HistoryPhase): number {
    const started = this.starts.get(phase);
    if (started === undefined) throw new Error(`History phase was not started: ${phase}`);
    const duration = this.now() - started;
    this.phases[phase] = duration;
    this.starts.delete(phase);
    return duration;
  }

  elapsedSince(phase: HistoryPhase): number | undefined {
    const started = this.origins.get(phase);
    return started === undefined ? undefined : this.now() - started;
  }

  markFirstMapContent(ms: number): void {
    this.firstMapContentMs ??= ms;
  }

  markFullMapContent(ms: number): void {
    this.fullMapContentMs ??= ms;
  }

  snapshot(): HistoryPerformanceSnapshot {
    return {
      phases: { ...this.phases },
      firstMapContentMs: this.firstMapContentMs,
      fullMapContentMs: this.fullMapContentMs,
    };
  }
}
