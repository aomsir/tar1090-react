import { describe, expect, it } from 'vitest';
import { DEFAULT_HISTORY_LOAD_CONCURRENCY, resolveHistoryLoadConcurrency } from './history';

describe('resolveHistoryLoadConcurrency', () => {
  it('falls back to default when env is missing', () => {
    expect(resolveHistoryLoadConcurrency(undefined)).toBe(DEFAULT_HISTORY_LOAD_CONCURRENCY);
  });

  it('uses a valid positive integer override', () => {
    expect(resolveHistoryLoadConcurrency('240')).toBe(240);
  });

  it('falls back when env is empty or invalid', () => {
    expect(resolveHistoryLoadConcurrency('')).toBe(DEFAULT_HISTORY_LOAD_CONCURRENCY);
    expect(resolveHistoryLoadConcurrency('abc')).toBe(DEFAULT_HISTORY_LOAD_CONCURRENCY);
    expect(resolveHistoryLoadConcurrency('0')).toBe(DEFAULT_HISTORY_LOAD_CONCURRENCY);
    expect(resolveHistoryLoadConcurrency('-1')).toBe(DEFAULT_HISTORY_LOAD_CONCURRENCY);
    expect(resolveHistoryLoadConcurrency('2.5')).toBe(DEFAULT_HISTORY_LOAD_CONCURRENCY);
  });
});
