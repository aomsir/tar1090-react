import type { Aircraft } from '@/domain/Aircraft';

export type EnrichFn = (ac: Aircraft) => Promise<void>;
export type OnEnriched = (ac: Aircraft) => void;

export class AircraftEnricher {
  private enrichFn: EnrichFn;
  private onEnriched: OnEnriched;

  constructor(enrichFn: EnrichFn, onEnriched: OnEnriched) {
    this.enrichFn = enrichFn;
    this.onEnriched = onEnriched;
  }

  enrichPending(list: Aircraft[]): void {
    for (const ac of list) {
      if (ac.enrichmentState !== 'pending') continue;
      ac.enrichmentState = 'inflight';
      // Defer enrichFn so the synchronous 'inflight' flip is observable even
      // if enrichFn has no await point (async fns run sync up to first await).
      void Promise.resolve()
        .then(() => this.enrichFn(ac))
        .then(
          () => this.onEnriched(ac),
          () => {
            ac.enrichmentState = 'done'; // give up; do not retry-loop
          },
        );
    }
  }
}
