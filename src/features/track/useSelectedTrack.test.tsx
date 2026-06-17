import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useSelectedTrack } from './useSelectedTrack';
import { historyStore } from '@/store/historyStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useLiveTick } from '@/store/liveTick';
import { aircraftStore } from '@/store/aircraftStore';
import type { AircraftSnapshot } from '@/data/types';
import type { TrackSegment } from './track';

vi.mock('@/data/historyLoader', () => ({
  historyLoader: { ensureLoaded: vi.fn(async () => undefined) },
}));

let captured: TrackSegment[] = [];
function Harness() {
  captured = useSelectedTrack();
  return null;
}

describe('useSelectedTrack', () => {
  beforeEach(() => {
    historyStore.reset();
    aircraftStore.reset();
    usePlaybackStore.getState().reset();
    useSelectionStore.setState({ selectedHex: null });
    useLiveTick.setState({ version: 0 });
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
    usePlaybackStore.getState().setBounds({ min: 100, max: 130 });
    act(() => useSelectionStore.setState({ selectedHex: 'abc' }));
    render(<Harness />);
    expect(captured.length).toBeGreaterThanOrEqual(1);
    expect(captured[0].coords.length).toBeGreaterThanOrEqual(2);
  });

  it('appends a live tail point from aircraftStore and merges with history', () => {
    historyStore.setFrames([
      { now: 100, messages: 0, aircraft: [{ hex: 'abc', lat: 0, lon: 0, altitude: 1000 }] as unknown as AircraftSnapshot['aircraft'] },
    ]);
    usePlaybackStore.getState().setBounds({ min: 100, max: 100 });
    aircraftStore.applySnapshot({
      now: 200,
      messages: 0,
      aircraft: [{ hex: 'abc', lat: 0, lon: 5, altitude: 1000 }] as unknown as AircraftSnapshot['aircraft'],
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

  it('does not append a duplicate when the live position is unchanged', () => {
    historyStore.setFrames([]);
    usePlaybackStore.getState().setBounds({ min: 100, max: 100 });
    aircraftStore.applySnapshot({
      now: 200,
      messages: 0,
      aircraft: [{ hex: 'abc', lat: 1, lon: 2, altitude: 1000 }] as unknown as AircraftSnapshot['aircraft'],
    });
    act(() => useSelectionStore.setState({ selectedHex: 'abc' }));
    render(<Harness />);
    act(() => {
      useLiveTick.setState({ version: 1 });
    });
    act(() => {
      useLiveTick.setState({ version: 2 });
    });
    const tailCoords = captured.flatMap((s) => s.coords).filter(([lon, lat]) => lon === 2 && lat === 1);
    expect(tailCoords).toHaveLength(1);
  });
});
