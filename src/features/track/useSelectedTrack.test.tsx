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
});
