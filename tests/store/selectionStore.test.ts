import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore } from './selectionStore';

describe('selectionStore', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedHex: null, selectedHexes: new Set() });
  });

  it('selects and clears an aircraft hex', () => {
    useSelectionStore.getState().select('781860');
    expect(useSelectionStore.getState().selectedHex).toBe('781860');
    useSelectionStore.getState().select(null);
    expect(useSelectionStore.getState().selectedHex).toBeNull();
  });

  it('toggleSelect adds and removes from selectedHexes', () => {
    const { toggleSelect } = useSelectionStore.getState();
    toggleSelect('abc123');
    expect(useSelectionStore.getState().selectedHexes.has('abc123')).toBe(true);
    toggleSelect('def456');
    expect(useSelectionStore.getState().selectedHexes.size).toBe(2);
    toggleSelect('abc123');
    expect(useSelectionStore.getState().selectedHexes.has('abc123')).toBe(false);
    expect(useSelectionStore.getState().selectedHexes.size).toBe(1);
  });

  it('toggleSelect also sets selectedHex to the last toggled-on hex', () => {
    useSelectionStore.getState().toggleSelect('abc123');
    expect(useSelectionStore.getState().selectedHex).toBe('abc123');
  });

  it('clearAll resets selectedHex and selectedHexes', () => {
    useSelectionStore.getState().toggleSelect('abc123');
    useSelectionStore.getState().toggleSelect('def456');
    useSelectionStore.getState().clearAll();
    expect(useSelectionStore.getState().selectedHex).toBeNull();
    expect(useSelectionStore.getState().selectedHexes.size).toBe(0);
  });
});
