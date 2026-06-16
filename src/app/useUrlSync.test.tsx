import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useUrlSync } from './useUrlSync';
import { useSelectionStore } from '@/store/selectionStore';

function Harness() {
  useUrlSync();
  return null;
}

describe('useUrlSync', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedHex: null });
    window.history.replaceState(null, '', '/');
  });

  it('reads ?icao= on mount and selects it', () => {
    window.history.replaceState(null, '', '/?icao=abc123');
    render(<Harness />);
    expect(useSelectionStore.getState().selectedHex).toBe('abc123');
  });

  it('writes ?icao= to the URL when selection changes', () => {
    render(<Harness />);
    act(() => useSelectionStore.getState().select('781860'));
    expect(window.location.search).toBe('?icao=781860');
    act(() => useSelectionStore.getState().select(null));
    expect(window.location.search).toBe('');
  });
});
