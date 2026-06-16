import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore } from './selectionStore';

describe('selectionStore', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedHex: null });
  });

  it('selects and clears an aircraft hex', () => {
    useSelectionStore.getState().select('781860');
    expect(useSelectionStore.getState().selectedHex).toBe('781860');
    useSelectionStore.getState().select(null);
    expect(useSelectionStore.getState().selectedHex).toBeNull();
  });
});
