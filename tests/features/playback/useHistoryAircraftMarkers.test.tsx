import { act, render } from '@testing-library/react';
import { useState, type RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AircraftSnapshot } from '@/data/types';
import { useHistoryAircraftMarkers } from '@/features/playback/useHistoryAircraftMarkers';
import type { MapController } from '@/map/MapController';
import { usePlaybackStore } from '@/store/playbackStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { historyStore } from '@/store/historyStore';
import { useLiveTick } from '@/store/liveTick';

const controller = { syncAircraft: vi.fn() } as unknown as MapController;
const controllerRef = { current: controller } as RefObject<MapController | null>;

function Harness() {
  useHistoryAircraftMarkers(controllerRef);
  return null;
}

function frame(now: number, hex: string, lon: number): AircraftSnapshot {
  return {
    now,
    messages: 0,
    aircraft: [{ hex, lat: 10, lon, altitude: 1000 }],
  };
}

describe('useHistoryAircraftMarkers', () => {
  beforeEach(() => {
    historyStore.reset();
    usePlaybackStore.getState().reset();
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
      altitudeFilterEnabled: false,
      altitudeFilterMin: 0,
      altitudeFilterMax: 45_000,
    });
    (controller.syncAircraft as ReturnType<typeof vi.fn>).mockClear();
  });

  it('syncs on mount and only once for cursor updates within the same effective frame', () => {
    historyStore.setFrames([frame(100, 'first', 1), frame(200, 'second', 2)]);
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(100);
    usePlaybackStore.getState().setMode('history');

    render(<Harness />);

    expect(controller.syncAircraft).toHaveBeenCalledTimes(1);
    expect(controller.syncAircraft).toHaveBeenLastCalledWith([
      expect.objectContaining({ hex: 'first', lon: 1 }),
    ]);

    act(() => {
      usePlaybackStore.getState().setCursor(150);
      usePlaybackStore.getState().setCursor(199);
    });

    expect(controller.syncAircraft).toHaveBeenCalledTimes(1);
  });

  it('syncs on a different effective frame and clears history markers on mode exit', () => {
    historyStore.setFrames([frame(100, 'first', 1), frame(200, 'second', 2)]);
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(100);
    usePlaybackStore.getState().setMode('history');
    render(<Harness />);
    (controller.syncAircraft as ReturnType<typeof vi.fn>).mockClear();

    act(() => usePlaybackStore.getState().setCursor(200));

    expect(controller.syncAircraft).toHaveBeenCalledWith([
      expect.objectContaining({ hex: 'second', lon: 2 }),
    ]);

    act(() => usePlaybackStore.getState().setMode('live'));

    expect(controller.syncAircraft).toHaveBeenLastCalledWith([]);
  });

  it('syncs again when a committed toolbar filter changes', () => {
    historyStore.setFrames([frame(100, 'first', 1)]);
    usePlaybackStore.getState().setBounds({ min: 100, max: 100 });
    usePlaybackStore.getState().setCursor(100);
    usePlaybackStore.getState().setMode('history');
    render(<Harness />);
    (controller.syncAircraft as ReturnType<typeof vi.fn>).mockClear();

    act(() => useToolbarStore.getState().setAltitudeFilterEnabled(true));

    expect(controller.syncAircraft).toHaveBeenCalledTimes(1);
    expect(controller.syncAircraft).toHaveBeenLastCalledWith([
      expect.objectContaining({ hex: 'first' }),
    ]);
  });

  it('syncs after a controller becomes ready', () => {
    historyStore.setFrames([frame(100, 'first', 1)]);
    usePlaybackStore.getState().setBounds({ min: 100, max: 100 });
    usePlaybackStore.getState().setCursor(100);
    usePlaybackStore.getState().setMode('history');
    const lateRef = { current: null } as RefObject<MapController | null>;

    function LateHarness() {
      const [readyVersion, setReadyVersion] = useState(0);
      useHistoryAircraftMarkers(lateRef, readyVersion);
      return (
        <button
          onClick={() => {
            lateRef.current = controller;
            setReadyVersion((version) => version + 1);
          }}
        >
          ready
        </button>
      );
    }

    const { getByRole } = render(<LateHarness />);
    expect(controller.syncAircraft).not.toHaveBeenCalled();

    act(() => getByRole('button', { name: 'ready' }).click());

    expect(controller.syncAircraft).toHaveBeenLastCalledWith([
      expect.objectContaining({ hex: 'first' }),
    ]);
  });

  it('stops syncing after unmount', () => {
    historyStore.setFrames([frame(100, 'first', 1)]);
    usePlaybackStore.getState().setBounds({ min: 100, max: 100 });
    usePlaybackStore.getState().setCursor(100);
    usePlaybackStore.getState().setMode('history');
    const view = render(<Harness />);
    view.unmount();
    (controller.syncAircraft as ReturnType<typeof vi.fn>).mockClear();

    act(() => {
      usePlaybackStore.getState().setCursor(100);
      useToolbarStore.getState().setAltitudeFilterEnabled(true);
      historyStore.setFrames([frame(100, 'second', 2)]);
      useLiveTick.getState().bump();
    });

    expect(controller.syncAircraft).not.toHaveBeenCalled();
  });
});
