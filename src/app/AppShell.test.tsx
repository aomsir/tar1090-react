import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import type { AircraftSnapshot } from '@/data/types';
import { historyStore } from '@/store/historyStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useLiveTick } from '@/store/liveTick';
import { useSeedVersion, clearHistorySeedForTest } from '@/data/liveHistorySeeder';

vi.mock('@/domain/enrich', () => ({
  enrichAircraft: vi.fn(async () => {}),
}));

let capturedOnReady: ((controller: unknown) => void) | null = null;
let capturedSelectCb: ((hex: string | null) => void) | null = null;
let capturedListOnSelect: ((hex: string) => void) | null = null;

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
  resetView: vi.fn(),
  setDim: vi.fn(),
  setFollow: vi.fn(),
  requestFullscreen: vi.fn(),
  exitFullscreen: vi.fn(),
  setLabelConfig: vi.fn(),
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
vi.mock('@/ui/ListPanel/ListPanel', () => ({
  ListPanel: ({ onSelect }: { onSelect: (hex: string) => void }) => {
    capturedListOnSelect = onSelect;
    return <div data-testid="list-panel" />;
  },
}));

import { AppShell } from './AppShell';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { aircraftStore } from '@/store/aircraftStore';
import { Aircraft } from '@/domain/Aircraft';

describe('AppShell', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedHex: null, selectedHexes: new Set() });
    useToolbarStore.setState({
      onlyMilitary: false,
      isolation: false,
      filterGroundVehicles: false,
      filterBlockedMLAT: false,
      follow: false,
    });
    historyStore.reset();
    aircraftStore.reset();
    usePlaybackStore.getState().reset();
    useLiveTick.setState({ version: 0 });
    clearHistorySeedForTest();
    capturedOnReady = null;
    capturedSelectCb = null;
    capturedListOnSelect = null;
    fakeController.onSelect.mockClear();
    fakeController.setSelected.mockClear();
    fakeController.centerOn.mockClear();
    fakeController.onViewChange.mockClear();
    fakeController.getViewExtentLonLat.mockClear();
    fakeController.showTrack.mockClear();
    fakeController.clearTrack.mockClear();
    fakeController.resetView.mockClear();
    fakeController.setDim.mockClear();
    fakeController.setFollow.mockClear();
    fakeController.requestFullscreen.mockClear();
    fakeController.exitFullscreen.mockClear();
    fakeController.setLabelConfig.mockClear();
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
    usePlaybackStore.getState().setMode('history');
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

  it('centers map on history aircraft when selected from list in history mode', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: '781860', lat: 25, lon: 120, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    await historyStore.buildPTracksData();
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setBounds({ min: 100, max: 100 });

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    expect(capturedListOnSelect).toBeTypeOf('function');
    act(() => {
      capturedListOnSelect!('781860');
    });

    expect(fakeController.centerOn).toHaveBeenCalledWith(120, 25);
  });

  it('centers on current-frame position in history mode, not last-seen', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: '781860', lat: 10, lon: 100, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
      {
        now: 200,
        messages: 0,
        aircraft: [
          { hex: '781860', lat: 50, lon: 150, altitude: 2000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    await historyStore.buildPTracksData();
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(100);

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    act(() => {
      capturedListOnSelect!('781860');
    });

    expect(fakeController.centerOn).toHaveBeenCalledWith(100, 10);
  });

  it('does not center when selected aircraft is absent from current frame', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: 'aaaaaa', lat: 10, lon: 100, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
      {
        now: 200,
        messages: 0,
        aircraft: [
          { hex: '781860', lat: 50, lon: 150, altitude: 2000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    await historyStore.buildPTracksData();
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(100);

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    act(() => {
      capturedListOnSelect!('781860');
    });

    expect(fakeController.centerOn).not.toHaveBeenCalled();
  });

  it('does not center when no frames are loaded in history mode', () => {
    usePlaybackStore.getState().setMode('history');

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    act(() => {
      capturedListOnSelect!('781860');
    });

    expect(useSelectionStore.getState().selectedHex).toBe('781860');
    expect(fakeController.centerOn).not.toHaveBeenCalled();
  });

  it('syncs only the selected aircraft marker in history mode', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: '781860', lat: 25, lon: 120, altitude: 1000 },
          { hex: 'aaaaaa', lat: 30, lon: 110, altitude: 2000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    await historyStore.buildPTracksData();
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setBounds({ min: 100, max: 100 });

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    // Before selection: empty aircraft list
    expect(fakeController.syncAircraft).toHaveBeenCalledWith([]);

    fakeController.syncAircraft.mockClear();
    act(() => {
      capturedListOnSelect!('781860');
    });

    // After selection: only the selected aircraft
    const calls = fakeController.syncAircraft.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const lastList = calls[calls.length - 1][0] as { hex: string }[];
    expect(lastList.length).toBe(1);
    expect(lastList[0].hex).toBe('781860');
  });

  it('centers map on live aircraft when selected from list in live mode', () => {
    const ac = new Aircraft('a00001');
    ac.update(
      { hex: 'a00001', lat: 35, lon: -100 } as AircraftSnapshot['aircraft'][number],
      Date.now(),
    );
    aircraftStore.map.set('a00001', ac);

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    expect(capturedListOnSelect).toBeTypeOf('function');
    act(() => {
      capturedListOnSelect!('a00001');
    });

    expect(fakeController.centerOn).toHaveBeenCalledWith(-100, 35);
  });

  it('shows a loading overlay when live history seed is loading', () => {
    useSeedVersion.setState({ loading: true });
    render(<AppShell />);
    expect(screen.getByTestId('seed-loading-overlay')).toBeInTheDocument();
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('hides the loading overlay when seed loading completes', () => {
    useSeedVersion.setState({ loading: false });
    render(<AppShell />);
    expect(screen.queryByTestId('seed-loading-overlay')).not.toBeInTheDocument();
  });

  it('does not show seed loading overlay in history mode', () => {
    useSeedVersion.setState({ loading: true });
    usePlaybackStore.getState().setMode('history');
    render(<AppShell />);
    expect(screen.queryByTestId('seed-loading-overlay')).not.toBeInTheDocument();
  });

  it('renders the toolbar', () => {
    render(<AppShell />);
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('re-syncs aircraft when onlyMilitary toggles without selection change', () => {
    const ac1 = new Aircraft('a00001');
    ac1.update(
      { hex: 'a00001', lat: 10, lon: 20 } as AircraftSnapshot['aircraft'][number],
      Date.now(),
    );
    const ac2 = new Aircraft('a00002');
    (ac2 as any).isMilitary = true;
    ac2.update(
      { hex: 'a00002', lat: 30, lon: 40 } as AircraftSnapshot['aircraft'][number],
      Date.now(),
    );
    aircraftStore.map.set('a00001', ac1);
    aircraftStore.map.set('a00002', ac2);

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });
    fakeController.syncAircraft.mockClear();

    act(() => {
      useToolbarStore.getState().toggle('onlyMilitary');
    });

    expect(fakeController.syncAircraft).toHaveBeenCalled();
    const lastList = fakeController.syncAircraft.mock.calls.at(-1)![0] as { hex: string }[];
    expect(lastList.length).toBe(1);
    expect(lastList[0].hex).toBe('a00002');
  });

  it('centers on selected aircraft when follow is toggled on', () => {
    const ac = new Aircraft('b00001');
    ac.update(
      { hex: 'b00001', lat: 55, lon: -120 } as AircraftSnapshot['aircraft'][number],
      Date.now(),
    );
    aircraftStore.map.set('b00001', ac);
    useSelectionStore.setState({ selectedHex: 'b00001' });

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });
    fakeController.centerOn.mockClear();

    act(() => {
      useToolbarStore.setState({ follow: true });
    });

    expect(fakeController.centerOn).toHaveBeenCalledWith(-120, 55);
  });
});
