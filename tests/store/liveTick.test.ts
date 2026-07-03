import { describe, it, expect, beforeEach } from 'vitest';
import { useLiveTick } from './liveTick';

describe('liveTick', () => {
  beforeEach(() => useLiveTick.setState({ version: 0 }));

  it('starts at 0 and increments on bump', () => {
    expect(useLiveTick.getState().version).toBe(0);
    useLiveTick.getState().bump();
    useLiveTick.getState().bump();
    expect(useLiveTick.getState().version).toBe(2);
  });
});
