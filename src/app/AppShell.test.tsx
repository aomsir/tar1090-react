import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import type { AircraftSnapshot } from '@/data/types';
import { historyStore } from '@/store/historyStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useLiveTick } from '@/store/liveTick';

let capturedOnReady: ((controller: unknown) => void) | null = null;
let capturedSelectCb: ((hex: string | null) => void) | null = null;

const fakeController = {
  onSelect: vi.fn((cb: (hex: string | null) => void) => {
    capturedSelectCb = cb;
  }),
  setSelected: vi.fn(),
  syncAircraft: vi.fn(),
  centerOn: vi.fn(),
  onViewChange: vi.fn(),
  getViewExtentLonLat: vi.fn(() => [0, 0, 10, 10] as [number, number, number, number]),
  showTrack: vi.fn(),
  clearTrack: vi.fn(),
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
vi.mock('@/features/playback/usePlayback', () => ({ usePlayback: () => {} }));
vi.mock('@/data/historyLoader', () => ({
  historyLoader: {
    ensureLoaded: vi.fn(async () => {
      historyStore.setFrames([
        {
          now: 100,
          messages: 0,
          aircraft: [
            { hex: '781860', lat: 0, lon: 0, altitude: 1000 },
          ] as unknown as AircraftSnapshot['aircraft'],
        },
        {
          now: 130,
          messages: 0,
          aircraft: [
            { hex: '781860', lat: 0, lon: 1, altitude: 1000 },
          ] as unknown as AircraftSnapshot['aircraft'],
        },
      ]);
    }),
  },
}));

import { AppShell } from './AppShell';
import { useSelectionStore } from '@/store/selectionStore';

describe('AppShell', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedHex: null });
    historyStore.reset();
    usePlaybackStore.getState().reset();
    useLiveTick.setState({ version: 0 });
    capturedOnReady = null;
    capturedSelectCb = null;
    fakeController.onSelect.mockClear();
    fakeController.setSelected.mockClear();
    fakeController.centerOn.mockClear();
    fakeController.onViewChange.mockClear();
    fakeController.getViewExtentLonLat.mockClear();
    fakeController.showTrack.mockClear();
    fakeController.clearTrack.mockClear();
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

  it('registers a viewport-change listener on ready', () => {
    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });
    expect(fakeController.onViewChange).toHaveBeenCalled();
  });

  it('draws the selected aircraft track when history is already loaded', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: '781860', lat: 0, lon: 0, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
      {
        now: 130,
        messages: 0,
        aircraft: [
          { hex: '781860', lat: 0, lon: 1, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    usePlaybackStore.getState().setBounds({ min: 100, max: 130 });

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });
    await act(async () => {
      capturedSelectCb!('781860');
      await Promise.resolve();
    });
    await waitFor(() => expect(fakeController.showTrack).toHaveBeenCalled());
    const segs = fakeController.showTrack.mock.calls.at(-1)![0] as unknown[];
    expect(segs.length).toBeGreaterThanOrEqual(1);
  });
});
