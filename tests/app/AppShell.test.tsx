import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { AircraftSnapshot } from '@/data/types';
import { historyStore } from '@/store/historyStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useLiveTick } from '@/store/liveTick';
import { useSeedVersion, clearHistorySeedForTest } from '@/data/liveHistorySeeder';
import { setTestLanguage } from '@/i18n/testUtils';

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
  setSelectedTrackKey: vi.fn(),
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
  showPTracks: vi.fn(),
  clearPTracks: vi.fn(),
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
vi.mock('@/ui/mobile/MobileDetailSheet', () => ({
  MobileDetailSheet: () => <div data-testid="mobile-detail-sheet" />,
}));
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
  HISTORY_RANGES: [
    { key: '1d', seconds: 86400 },
    { key: '3d', seconds: 259200 },
    { key: '1w', seconds: 604800 },
    { key: '1m', seconds: 2592000 },
    { key: 'unlimited', seconds: Infinity },
  ],
}));
vi.mock('@/ui/ListPanel/ListPanel', () => ({
  ListPanel: ({ onSelect }: { onSelect: (hex: string) => void }) => {
    capturedListOnSelect = onSelect;
    return <div data-testid="list-panel" />;
  },
}));

import { AppShell } from '@/app/AppShell';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { aircraftStore } from '@/store/aircraftStore';
import { Aircraft } from '@/domain/Aircraft';

describe('AppShell', () => {
  beforeEach(async () => {
    await setTestLanguage('en');
    useSelectionStore.setState({
      selectedHex: null,
      selectedPassId: null,
      selectedHexes: new Set(),
    });
    useToolbarStore.setState({
      onlyMilitary: false,
      isolation: false,
      filterGroundVehicles: false,
      filterBlockedMLAT: false,
      follow: false,
      persistence: false,
      allTracks: false,
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
    fakeController.setSelectedTrackKey.mockClear();
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
    fakeController.showPTracks.mockClear();
    fakeController.clearPTracks.mockClear();
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

  it('rehydrates label config into the controller on map ready', () => {
    useToolbarStore.setState({
      enableLabels: true,
      extendedLabels: 2,
      trackLabels: true,
    });

    render(<AppShell />);

    act(() => {
      capturedOnReady!(fakeController);
    });

    expect(fakeController.setLabelConfig).toHaveBeenCalledWith({
      enabled: true,
      extended: 2,
      trackLabels: true,
    });
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
    await historyStore.buildPassData();

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });
    await act(async () => {
      useSelectionStore.getState().selectPass('781860:100', '781860');
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
    await historyStore.buildPassData();
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setBounds({ min: 100, max: 100 });

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    expect(capturedListOnSelect).toBeTypeOf('function');
    act(() => {
      capturedListOnSelect!('781860:100');
    });

    expect(fakeController.centerOn).toHaveBeenCalledWith(120, 25);
  });

  it('switches duplicate-hex history passes from the desktop list', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: '781860', flight: 'FIRST', lat: 10, lon: 100, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
      {
        now: 44000,
        messages: 0,
        aircraft: [
          { hex: '781860', flight: 'SECOND', lat: 50, lon: 150, altitude: 2000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    await historyStore.buildPassData();
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setCursor(44000);

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    fakeController.syncAircraft.mockClear();
    fakeController.setSelectedTrackKey.mockClear();
    fakeController.centerOn.mockClear();

    act(() => {
      capturedListOnSelect!('781860:100');
    });

    expect(useSelectionStore.getState()).toMatchObject({
      selectedPassId: '781860:100',
      selectedHex: '781860',
    });
    expect(fakeController.setSelectedTrackKey).toHaveBeenLastCalledWith('781860:100');
    expect(fakeController.centerOn).toHaveBeenLastCalledWith(100, 10);
    expect(fakeController.syncAircraft.mock.calls.at(-1)![0]).toMatchObject([{ flight: 'FIRST' }]);

    act(() => {
      capturedListOnSelect!('781860:44000');
    });

    expect(useSelectionStore.getState()).toMatchObject({
      selectedPassId: '781860:44000',
      selectedHex: '781860',
    });
    expect(fakeController.setSelectedTrackKey).toHaveBeenLastCalledWith('781860:44000');
    expect(fakeController.centerOn).toHaveBeenLastCalledWith(150, 50);
    expect(fakeController.syncAircraft.mock.calls.at(-1)![0]).toMatchObject([{ flight: 'SECOND' }]);
  });

  it('keeps the current pass selection when its history marker is clicked', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [{ hex: '781860', lat: 25, lon: 120, altitude: 1000 }],
      },
    ]);
    await historyStore.buildPassData();
    usePlaybackStore.getState().setMode('history');

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
      useSelectionStore.getState().selectPass('781860:100', '781860');
      capturedSelectCb!('781860');
    });

    expect(useSelectionStore.getState()).toMatchObject({
      selectedPassId: '781860:100',
      selectedHex: '781860',
    });
  });

  it('clears all selection when the map background is clicked', () => {
    useSelectionStore.getState().selectPass('781860:100', '781860');
    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
      capturedSelectCb!(null);
    });

    expect(useSelectionStore.getState()).toMatchObject({
      selectedPassId: null,
      selectedHex: null,
    });
  });

  it('does not change selection when a history list pass id is missing', () => {
    useSelectionStore.getState().selectPass('existing:100', 'existing');
    usePlaybackStore.getState().setMode('history');

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    act(() => {
      capturedListOnSelect!('missing:100');
    });

    expect(useSelectionStore.getState()).toMatchObject({
      selectedPassId: 'existing:100',
      selectedHex: 'existing',
    });
    expect(fakeController.centerOn).not.toHaveBeenCalled();
  });

  it('centers on the selected pass final position in history mode', async () => {
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
    await historyStore.buildPassData();
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(100);

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    act(() => {
      capturedListOnSelect!('781860:100');
    });

    expect(fakeController.centerOn).toHaveBeenCalledWith(150, 50);
  });

  it('does not center when the selected pass has no position', async () => {
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
        aircraft: [{ hex: '781860', altitude: 2000 }] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    await historyStore.buildPassData();
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(100);

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    act(() => {
      capturedListOnSelect!('781860:200');
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

    expect(useSelectionStore.getState().selectedHex).toBeNull();
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
    await historyStore.buildPassData();
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
      capturedListOnSelect!('781860:100');
    });

    // After selection: only the selected aircraft
    const calls = fakeController.syncAircraft.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const lastList = calls[calls.length - 1][0] as { hex: string }[];
    expect(lastList.length).toBe(1);
    expect(lastList[0].hex).toBe('781860');
    expect(fakeController.setSelectedTrackKey).toHaveBeenCalledWith('781860:100');
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

  it('shows a loading overlay when live history seed is loading', async () => {
    useSeedVersion.setState({ loading: true });
    render(<AppShell />);
    expect(screen.getByTestId('seed-loading-overlay')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Loading|加载/)).toBeInTheDocument());
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

  it('renders toolbar and list inside a shared right dock', () => {
    render(<AppShell />);

    const dock = screen.getByTestId('right-dock');
    expect(dock).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-dock-slot')).toContainElement(screen.getByTestId('toolbar'));
    expect(screen.getByTestId('list-dock-slot')).toContainElement(screen.getByTestId('list-panel'));
  });

  it('re-syncs aircraft when onlyMilitary toggles without selection change', () => {
    const ac1 = new Aircraft('a00001');
    ac1.update(
      { hex: 'a00001', lat: 10, lon: 20 } as AircraftSnapshot['aircraft'][number],
      Date.now(),
    );
    const ac2 = new Aircraft('a00002');
    (ac2 as Aircraft).isMilitary = true;
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

  it('isolation filters to single selected aircraft in single-select mode', () => {
    const ac1 = new Aircraft('a00001');
    ac1.update(
      { hex: 'a00001', lat: 10, lon: 20 } as AircraftSnapshot['aircraft'][number],
      Date.now(),
    );
    const ac2 = new Aircraft('a00002');
    ac2.update(
      { hex: 'a00002', lat: 30, lon: 40 } as AircraftSnapshot['aircraft'][number],
      Date.now(),
    );
    aircraftStore.map.set('a00001', ac1);
    aircraftStore.map.set('a00002', ac2);
    useSelectionStore.getState().select('a00001');

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });
    fakeController.syncAircraft.mockClear();

    act(() => {
      useToolbarStore.setState({ isolation: true });
    });

    const lastList = fakeController.syncAircraft.mock.calls.at(-1)![0] as { hex: string }[];
    expect(lastList.length).toBe(1);
    expect(lastList[0].hex).toBe('a00001');
  });

  it('allTracks calls showPTracks with position histories when enabled in live mode', () => {
    const ac = new Aircraft('a00001');
    ac.update({ hex: 'a00001', lat: 10, lon: 20 } as AircraftSnapshot['aircraft'][number], 1000);
    ac.update({ hex: 'a00001', lat: 11, lon: 21 } as AircraftSnapshot['aircraft'][number], 1001);
    aircraftStore.map.set('a00001', ac);

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });
    fakeController.showPTracks.mockClear();

    act(() => {
      useToolbarStore.setState({ allTracks: true });
    });

    expect(fakeController.showPTracks).toHaveBeenCalled();
    const tracksMap = fakeController.showPTracks.mock.calls.at(-1)![0] as Map<string, unknown[]>;
    expect(tracksMap).toBeInstanceOf(Map);
    expect(tracksMap.has('a00001')).toBe(true);
    expect(tracksMap.get('a00001')!.length).toBeGreaterThanOrEqual(2);
  });

  it('allTracks refreshes pTracks on new live ticks', () => {
    const ac = new Aircraft('a00001');
    ac.update({ hex: 'a00001', lat: 10, lon: 20 } as AircraftSnapshot['aircraft'][number], 1000);
    ac.update({ hex: 'a00001', lat: 11, lon: 21 } as AircraftSnapshot['aircraft'][number], 1001);
    aircraftStore.map.set('a00001', ac);

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    act(() => {
      useToolbarStore.setState({ allTracks: true });
    });
    fakeController.showPTracks.mockClear();

    act(() => {
      ac.update({ hex: 'a00001', lat: 12, lon: 22 } as AircraftSnapshot['aircraft'][number], 1002);
      useLiveTick.getState().bump();
    });

    expect(fakeController.showPTracks).toHaveBeenCalled();
    const tracksMap = fakeController.showPTracks.mock.calls.at(-1)![0] as Map<string, unknown[]>;
    expect(tracksMap.get('a00001')!.length).toBeGreaterThanOrEqual(3);
  });

  it('allTracks clears pTracks when disabled in live mode', () => {
    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });

    act(() => {
      useToolbarStore.setState({ allTracks: true });
    });
    act(() => {
      useToolbarStore.setState({ allTracks: false });
    });

    expect(fakeController.clearPTracks).toHaveBeenCalled();
  });
});

describe('AppShell mobile layout', () => {
  function stubMobileViewport() {
    const mql = {
      matches: true,
      media: '(max-width: 767px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
  }

  beforeEach(async () => {
    await setTestLanguage('en');
    useSelectionStore.setState({ selectedHex: null, selectedHexes: new Set() });
    useToolbarStore.setState({
      onlyMilitary: false,
      isolation: false,
      filterGroundVehicles: false,
      filterBlockedMLAT: false,
      follow: false,
      persistence: false,
      allTracks: false,
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
    fakeController.showPTracks.mockClear();
    fakeController.clearPTracks.mockClear();
    stubMobileViewport();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders mobile chrome and hides desktop panels', () => {
    render(<AppShell />);
    expect(screen.getByTestId('mobile-top-bar')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('map-root')).toBeInTheDocument();
    expect(screen.queryByTestId('command-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('list-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('right-dock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('replay-bar')).not.toBeInTheDocument();
  });

  it('shows altitude legend only when nothing is selected', () => {
    render(<AppShell />);
    expect(screen.getByTestId('altitude-legend')).toBeInTheDocument();
    act(() => useSelectionStore.getState().select('abc123'));
    expect(screen.queryByTestId('altitude-legend')).not.toBeInTheDocument();
  });

  it('renders the detail sheet when an aircraft with data is selected', () => {
    const ac = new Aircraft('abc123');
    ac.update(
      {
        hex: 'abc123',
        flight: 'CES2345',
        lat: 30,
        lon: 120,
        altitude: 36000,
      } as AircraftSnapshot['aircraft'][number],
      Date.now(),
    );
    aircraftStore.map.set('abc123', ac);
    render(<AppShell />);
    act(() => useSelectionStore.getState().select('abc123'));
    expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
  });

  it('shows the history loading overlay while history loads', () => {
    render(<AppShell />);
    expect(screen.queryByTestId('mobile-history-loading')).not.toBeInTheDocument();
    act(() => {
      usePlaybackStore.setState({ loading: true, progress: { done: 1, total: 10 } });
    });
    expect(screen.getByTestId('mobile-history-loading')).toBeInTheDocument();
  });

  it('centers on the final position after selecting a history pass from the mobile list', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: '781860', flight: 'PASS', lat: 10, lon: 100, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
      {
        now: 200,
        messages: 0,
        aircraft: [
          { hex: '781860', flight: 'PASS', lat: 50, lon: 150, altitude: 2000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    await historyStore.buildPassData();
    usePlaybackStore.getState().setMode('history');

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show aircraft list' }));
    fireEvent.click(screen.getByRole('option', { name: /PASS/ }));

    expect(useSelectionStore.getState()).toMatchObject({
      selectedPassId: '781860:100',
      selectedHex: '781860',
    });
    expect(fakeController.centerOn).toHaveBeenCalledWith(150, 50);
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
  });

  it('does not center after selecting an unpositioned history pass from the mobile list', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: '781860', flight: 'PASS', altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    await historyStore.buildPassData();
    usePlaybackStore.getState().setMode('history');

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show aircraft list' }));
    fireEvent.click(screen.getByRole('option', { name: /PASS/ }));

    expect(useSelectionStore.getState()).toMatchObject({
      selectedPassId: '781860:100',
      selectedHex: '781860',
    });
    expect(fakeController.centerOn).not.toHaveBeenCalled();
  });

  it('keeps live mobile selection behavior unchanged', () => {
    const ac = new Aircraft('a00001');
    ac.update(
      { hex: 'a00001', flight: 'LIVE', lat: 35, lon: -100 } as AircraftSnapshot['aircraft'][number],
      Date.now(),
    );
    aircraftStore.map.set('a00001', ac);

    render(<AppShell />);
    act(() => {
      capturedOnReady!(fakeController);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show aircraft list' }));
    fireEvent.click(screen.getByRole('option', { name: /LIVE/ }));

    expect(useSelectionStore.getState()).toMatchObject({
      selectedPassId: null,
      selectedHex: 'a00001',
    });
    expect(fakeController.centerOn).toHaveBeenCalledWith(-100, 35);
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
  });
});
