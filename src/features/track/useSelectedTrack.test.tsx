import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { useSelectedTrack } from './useSelectedTrack';
import { historyStore } from '@/store/historyStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useLiveTick } from '@/store/liveTick';
import { aircraftStore } from '@/store/aircraftStore';
import type { AircraftSnapshot } from '@/data/types';
import type { TrackPoint, TrackSegment } from './track';
import { historyLoader } from '@/data/historyLoader';
import { loadAircraftTrace } from './aircraftTrace';
import {
  loadLiveHistory,
  clearHistorySeedForTest,
} from '@/data/liveHistorySeeder';

vi.mock('@/data/historyLoader', () => ({
  historyLoader: { ensureLoaded: vi.fn(async () => undefined) },
  HISTORY_RANGES: [
    { key: '1d',        label: '1 day',  seconds: 86400 },
    { key: '3d',        label: '3 days', seconds: 259200 },
    { key: '1w',        label: '1 week', seconds: 604800 },
    { key: '1m',        label: '1 month', seconds: 2592000 },
    { key: 'unlimited', label: 'All', seconds: Infinity },
  ],
}));

vi.mock('./aircraftTrace', async () => {
  const actual = await vi.importActual<typeof import('./aircraftTrace')>('./aircraftTrace');
  return {
    ...actual,
    loadAircraftTrace: vi.fn(async () => []),
  };
});

let captured: TrackSegment[] = [];
function Harness() {
  const segs = useSelectedTrack();
  useEffect(() => {
    captured = segs;
  }, [segs]);
  return null;
}

const point = (over: Partial<TrackPoint>): TrackPoint => ({
  lon: 0,
  lat: 0,
  alt: 1000,
  ts: 0,
  ground: false,
  ...over,
});

describe('useSelectedTrack', () => {
  beforeEach(() => {
    historyStore.reset();
    aircraftStore.reset();
    usePlaybackStore.getState().reset();
    useSelectionStore.setState({ selectedHex: null });
    useLiveTick.setState({ version: 0 });
    vi.mocked(historyLoader.ensureLoaded).mockClear();
    vi.mocked(loadAircraftTrace).mockReset();
    vi.mocked(loadAircraftTrace).mockResolvedValue([]);
    clearHistorySeedForTest();
    captured = [];
  });

  it('returns [] when nothing is selected', () => {
    render(<Harness />);
    expect(captured).toEqual([]);
  });

  it('builds segments from history points once loaded for the selected hex', () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: 'abc', lat: 0, lon: 0, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
      {
        now: 130,
        messages: 0,
        aircraft: [
          { hex: 'abc', lat: 0, lon: 1, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setBounds({ min: 100, max: 130 });
    act(() => useSelectionStore.setState({ selectedHex: 'abc' }));
    render(<Harness />);
    expect(captured.length).toBeGreaterThanOrEqual(1);
    expect(captured[0].coords.length).toBeGreaterThanOrEqual(2);
  });

  it('does not fetch full history merely because an aircraft is selected', async () => {
    render(<Harness />);
    await act(async () => {
      useSelectionStore.setState({ selectedHex: 'abc' });
    });
    expect(historyLoader.ensureLoaded).not.toHaveBeenCalled();
  });

  it('appends a live tail point from aircraftStore and merges with history', () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: 'abc', lat: 0, lon: 0, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setBounds({ min: 100, max: 100 });
    aircraftStore.applySnapshot({
      now: 200,
      messages: 0,
      aircraft: [
        { hex: 'abc', lat: 0, lon: 5, altitude: 1000 },
      ] as unknown as AircraftSnapshot['aircraft'],
    });
    act(() => useSelectionStore.setState({ selectedHex: 'abc' }));
    render(<Harness />);
    act(() => {
      useLiveTick.setState({ version: 1 });
    });
    expect(captured.length).toBeGreaterThanOrEqual(1);
    const allCoords = captured.flatMap((s) => s.coords);
    expect(allCoords).toContainEqual([0, 0]);
    expect(allCoords).toContainEqual([5, 0]);
  });

  it('does not append a duplicate when the live position is unchanged', async () => {
    historyStore.setFrames([]);
    usePlaybackStore.getState().setBounds({ min: 100, max: 100 });
    aircraftStore.applySnapshot({
      now: 200,
      messages: 0,
      aircraft: [
        { hex: 'abc', lat: 1, lon: 2, altitude: 1000 },
      ] as unknown as AircraftSnapshot['aircraft'],
    });
    render(<Harness />);
    await act(async () => {
      useSelectionStore.setState({ selectedHex: 'abc' });
    });
    act(() => {
      useLiveTick.setState({ version: 1 });
    });
    act(() => {
      useLiveTick.setState({ version: 2 });
    });
    const tailCoords = captured
      .flatMap((s) => s.coords)
      .filter(([lon, lat]) => lon === 2 && lat === 1);
    expect(tailCoords).toHaveLength(1);
  });

  it('loads and renders server trace points when a live aircraft is selected', async () => {
    vi.mocked(loadAircraftTrace).mockResolvedValue([
      point({ ts: 100, lon: 1, lat: 1 }),
      point({ ts: 130, lon: 2, lat: 2 }),
    ]);

    render(<Harness />);
    act(() => useSelectionStore.setState({ selectedHex: 'abc123' }));

    await waitFor(() => {
      expect(loadAircraftTrace).toHaveBeenCalledWith('abc123');
      expect(captured.flatMap((s) => s.coords)).toEqual(
        expect.arrayContaining([
          [1, 1],
          [2, 2],
        ]),
      );
    });
  });

  it('merges loaded live trace points with the current live tail', async () => {
    vi.mocked(loadAircraftTrace).mockResolvedValue([point({ ts: 100, lon: 1, lat: 1 })]);
    aircraftStore.applySnapshot({
      now: 200,
      messages: 0,
      aircraft: [{ hex: 'abc123', lat: 5, lon: 6, altitude: 1000 }] as unknown as AircraftSnapshot['aircraft'],
    });

    render(<Harness />);
    act(() => useSelectionStore.setState({ selectedHex: 'abc123' }));
    act(() => useLiveTick.setState({ version: 1 }));

    await waitFor(() => {
      expect(captured.flatMap((s) => s.coords)).toEqual(
        expect.arrayContaining([
          [1, 1],
          [6, 5],
        ]),
      );
    });
  });

  it('falls back to the live tail if aircraft trace loading fails', async () => {
    vi.mocked(loadAircraftTrace).mockRejectedValue(new Error('network'));
    aircraftStore.applySnapshot({
      now: 200,
      messages: 0,
      aircraft: [{ hex: 'abc123', lat: 5, lon: 6, altitude: 1000 }] as unknown as AircraftSnapshot['aircraft'],
    });

    render(<Harness />);
    act(() => useSelectionStore.setState({ selectedHex: 'abc123' }));
    act(() => useLiveTick.setState({ version: 1 }));

    await waitFor(() => {
      expect(loadAircraftTrace).toHaveBeenCalledWith('abc123');
      expect(captured.flatMap((s) => s.coords)).toContainEqual([6, 5]);
    });
  });

  it('does not load aircraft trace files in history mode', () => {
    usePlaybackStore.getState().setMode('history');
    usePlaybackStore.getState().setBounds({ min: 100, max: 130 });
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [{ hex: 'abc123', lat: 1, lon: 2, altitude: 1000 }] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);

    act(() => useSelectionStore.setState({ selectedHex: 'abc123' }));
    render(<Harness />);

    expect(loadAircraftTrace).not.toHaveBeenCalled();
    expect(captured.flatMap((s) => s.coords)).toContainEqual([2, 1]);
  });

  it('uses history seed as fallback when trace returns empty in live mode', async () => {
    await loadLiveHistory(
      async (n) => ({
        now: 100 + n * 30,
        messages: 0,
        aircraft: [{ hex: 'abc123', lat: 30 + n, lon: 120 + n, altitude: 5000 }],
      }),
      3,
      2000,
    );

    vi.mocked(loadAircraftTrace).mockResolvedValue([]);

    aircraftStore.applySnapshot({
      now: 200,
      messages: 1,
      aircraft: [{ hex: 'abc123', lat: 33, lon: 123, altitude: 5000 }] as unknown as AircraftSnapshot['aircraft'],
    });

    render(<Harness />);
    act(() => useSelectionStore.setState({ selectedHex: 'abc123' }));
    act(() => useLiveTick.setState({ version: 1 }));

    await waitFor(() => {
      const allCoords = captured.flatMap((s) => s.coords);
      expect(allCoords.some(([lon]) => lon === 120)).toBe(true);
    });
  });
});
