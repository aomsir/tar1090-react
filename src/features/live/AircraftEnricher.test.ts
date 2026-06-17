import { describe, it, expect, vi } from 'vitest';
import { Aircraft } from '@/domain/Aircraft';
import { AircraftEnricher } from './AircraftEnricher';

describe('AircraftEnricher', () => {
  it('enriches pending aircraft once and fires onEnriched', async () => {
    const enrichFn = vi.fn(async (ac: Aircraft) => {
      ac.registration = 'N1';
      ac.enrichmentState = 'done';
    });
    const onEnriched = vi.fn();
    const enricher = new AircraftEnricher(enrichFn, onEnriched);

    const a = new Aircraft('A00001');
    enricher.enrichPending([a]);
    expect(a.enrichmentState).toBe('inflight'); // flipped synchronously
    await vi.waitFor(() => expect(a.enrichmentState).toBe('done'));

    enricher.enrichPending([a]); // second pass: already done, no re-enrich
    await Promise.resolve();

    expect(enrichFn).toHaveBeenCalledTimes(1);
    expect(onEnriched).toHaveBeenCalledWith(a);
  });

  it('skips aircraft already inflight', () => {
    const enrichFn = vi.fn(async () => {});
    const enricher = new AircraftEnricher(enrichFn, vi.fn());
    const a = new Aircraft('A00002');
    a.enrichmentState = 'inflight';
    enricher.enrichPending([a]);
    expect(enrichFn).not.toHaveBeenCalled();
  });
});
