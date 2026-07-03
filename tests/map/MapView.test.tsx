import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const dispose = vi.fn();
const ctor = vi.fn();

vi.mock('./MapController', () => ({
  MapController: class {
    constructor(target: HTMLElement) {
      ctor(target);
    }
    dispose = dispose;
    syncAircraft = vi.fn();
    setSelected = vi.fn();
    onSelect = vi.fn();
  },
}));

import { MapView } from './MapView';

describe('MapView', () => {
  beforeEach(() => {
    dispose.mockClear();
    ctor.mockClear();
  });

  it('creates a MapController against the map-root element and reports it via onReady', () => {
    const onReady = vi.fn();
    const { getByTestId } = render(<MapView onReady={onReady} />);
    expect(ctor).toHaveBeenCalledWith(getByTestId('map-root'));
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('disposes the controller on unmount', () => {
    const { unmount } = render(<MapView />);
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('mounts the map only once even when onReady identity changes', () => {
    const { rerender } = render(<MapView onReady={vi.fn()} />);
    rerender(<MapView onReady={vi.fn()} />);
    expect(ctor).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
  });
});
