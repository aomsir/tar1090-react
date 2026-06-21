export const DEFAULT_HISTORY_LOAD_CONCURRENCY = 48;

export function resolveHistoryLoadConcurrency(raw: string | undefined): number {
  if (!raw) return DEFAULT_HISTORY_LOAD_CONCURRENCY;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_HISTORY_LOAD_CONCURRENCY;
  }
  return parsed;
}

export const HISTORY_LOAD_CONCURRENCY = resolveHistoryLoadConcurrency(
  import.meta.env.VITE_HISTORY_LOAD_CONCURRENCY,
);
