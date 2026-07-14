import type { AircraftSnapshot } from '@/data/types';
import type { HistoryStatistics } from '@/features/stats/historyStats';
import type { BuildAircraftPassesOptions } from './aircraftPasses';
import {
  computeHistoryStatisticsDTO,
  preprocessHistoryFrames,
  type HistoryStatisticsInputDTO,
  type PreprocessedHistory,
} from './historyPreprocess';

export type HistoryPreprocessRequest =
  | { type: 'preprocess'; requestId: number; generation: number; frames: AircraftSnapshot[]; options: BuildAircraftPassesOptions }
  | { type: 'statistics'; requestId: number; generation: number; input: HistoryStatisticsInputDTO };

export type HistoryPreprocessResponse =
  | { type: 'success'; requestId: number; generation: number; result: PreprocessedHistory }
  | { type: 'statistics-success'; requestId: number; generation: number; result: HistoryStatistics }
  | { type: 'failure'; requestId: number; generation: number; message: string };

export class HistoryPreprocessCancelledError extends Error {
  constructor() {
    super('History preprocessing was cancelled');
    this.name = 'HistoryPreprocessCancelledError';
  }
}

type Pending = {
  generation: number;
  type: HistoryPreprocessRequest['type'];
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  fallback: () => unknown;
};

type Fallbacks = {
  preprocess: typeof preprocessHistoryFrames;
  statistics: typeof computeHistoryStatisticsDTO;
};

export class HistoryPreprocessClient {
  private worker: Worker | null | undefined;
  private readonly pending = new Map<number, Pending>();
  private requestId = 0;
  private authoritativeGeneration = -Infinity;
  private disposed = false;
  private readonly createWorker: () => Worker | null;
  private readonly fallback: Fallbacks;

  constructor(
    createWorker: () => Worker | null = () => typeof Worker === 'undefined' ? null : new Worker(new URL('./historyPreprocess.worker.ts', import.meta.url), { type: 'module' }),
    fallback: Fallbacks = { preprocess: preprocessHistoryFrames, statistics: computeHistoryStatisticsDTO },
  ) {
    this.createWorker = createWorker;
    this.fallback = fallback;
  }

  preprocess(generation: number, frames: AircraftSnapshot[], options: BuildAircraftPassesOptions, onFallback?: () => void): Promise<PreprocessedHistory> {
    return this.request('preprocess', generation, { frames, options }, onFallback);
  }

  statistics(generation: number, input: HistoryStatisticsInputDTO, onFallback?: () => void): Promise<HistoryStatistics> {
    return this.request('statistics', generation, { input }, onFallback);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.rejectAll(new HistoryPreprocessCancelledError());
    this.worker?.terminate();
    this.worker = null;
  }

  private request<T>(
    type: HistoryPreprocessRequest['type'],
    generation: number,
    payload: { frames: AircraftSnapshot[]; options: BuildAircraftPassesOptions } | { input: HistoryStatisticsInputDTO },
    onFallback?: () => void,
  ): Promise<T> {
    if (this.disposed || generation < this.authoritativeGeneration) {
      return Promise.reject(new HistoryPreprocessCancelledError());
    }
    if (generation > this.authoritativeGeneration) {
      this.authoritativeGeneration = generation;
      for (const [requestId, pending] of this.pending) {
        if (pending.generation < generation) {
          this.pending.delete(requestId);
          pending.reject(new HistoryPreprocessCancelledError());
        }
      }
    }

    const requestId = ++this.requestId;
    const request = type === 'preprocess'
      ? { type, requestId, generation, ...(payload as { frames: AircraftSnapshot[]; options: BuildAircraftPassesOptions }) }
      : { type, requestId, generation, ...(payload as { input: HistoryStatisticsInputDTO }) };
    const worker = this.getWorker();
    if (!worker) {
      try {
        onFallback?.();
        return Promise.resolve(this.runFallback(request) as T);
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, {
        generation,
        type,
        resolve: resolve as (result: unknown) => void,
        reject,
        fallback: () => {
          onFallback?.();
          return this.runFallback(request);
        },
      });
      try {
        worker.postMessage(request);
      } catch {
        this.breakWorker();
      }
    });
  }

  private getWorker(): Worker | null {
    if (this.worker !== undefined) return this.worker;
    try {
      this.worker = this.createWorker();
    } catch {
      this.worker = null;
    }
    if (!this.worker) return null;
    this.worker.onmessage = (event: MessageEvent<HistoryPreprocessResponse>) => this.handleMessage(event.data);
    this.worker.onerror = () => this.breakWorker();
    return this.worker;
  }

  private handleMessage(message: HistoryPreprocessResponse): void {
    const pending = this.pending.get(message.requestId);
    if (!pending || pending.generation !== message.generation) return;
    this.pending.delete(message.requestId);
    if (message.type === 'failure') {
      this.resolveFallback(pending);
      return;
    }
    const expected = pending.type === 'preprocess' ? 'success' : 'statistics-success';
    if (message.type !== expected) {
      pending.reject(new Error(`History preprocessing response type mismatch: expected ${expected}, received ${message.type}`));
      return;
    }
    pending.resolve(message.result);
  }

  private breakWorker(): void {
    const pending = Array.from(this.pending.values());
    this.pending.clear();
    this.worker?.terminate();
    this.worker = undefined;
    for (const request of pending) this.resolveFallback(request);
  }

  private resolveFallback(pending: Pending): void {
    try {
      pending.resolve(pending.fallback());
    } catch (error) {
      pending.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private runFallback(request: HistoryPreprocessRequest): unknown {
    return request.type === 'preprocess'
      ? this.fallback.preprocess(request.frames, request.options)
      : this.fallback.statistics(request.input);
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}

export const historyPreprocessClient = new HistoryPreprocessClient();
