import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

let capturedOnReady: ((controller: unknown) => void) | null = null;
let capturedSelectCb: ((hex: string | null) => void) | null = null;

const fakeController = {
  onSelect: vi.fn((cb: (hex: string | null) => void) => {
    capturedSelectCb = cb;
  }),
  setSelected: vi.fn(),
  syncAircraft: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('@/map/MapView', () => ({
  MapView: ({ onReady }: { onReady?: (c: unknown) => void }) => {
    capturedOnReady = onReady ?? null;
    return <div data-testid="map-root" />;
  },
}));
vi.mock('@/features/live/useLiveData', () => ({ useLiveData: () => {} }));
vi.mock('@/app/useUrlSync', () => ({ useUrlSync: () => {} }));

import { AppShell } from './AppShell';
import { useSelectionStore } from '@/store/selectionStore';

describe('AppShell', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedHex: null });
    capturedOnReady = null;
    capturedSelectCb = null;
    fakeController.onSelect.mockClear();
    fakeController.setSelected.mockClear();
  });

  it('renders command bar, list panel, replay bar and map regions', () => {
    render(<AppShell />);
    expect(screen.getByTestId('command-bar')).toBeInTheDocument();
    expect(screen.getByTestId('list-panel')).toBeInTheDocument();
    expect(screen.getByTestId('replay-bar')).toBeInTheDocument();
    expect(screen.getByTestId('map-root')).toBeInTheDocument();
  });

  it('bridges map click → selection store → controller.setSelected', () => {
    render(<AppShell />);

    expect(capturedOnReady).toBeTypeOf('function');
    act(() => {
      capturedOnReady!(fakeController);
    });

    expect(fakeController.onSelect).toHaveBeenCalled();
    expect(capturedSelectCb).toBeTypeOf('function');

    act(() => {
      capturedSelectCb!('781860');
    });

    expect(useSelectionStore.getState().selectedHex).toBe('781860');
    expect(fakeController.setSelected).toHaveBeenCalledWith('781860');
  });
});
