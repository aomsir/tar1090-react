import { act, render } from '@testing-library/react';
import { useState, type RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AircraftSnapshot } from '@/data/types';
import { Aircraft } from '@/domain/Aircraft';
import type { AircraftPass } from '@/features/playback/aircraftPasses';
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

function pass(hex = 'selected'): AircraftPass {
  const aircraft = new Aircraft(hex);
  aircraft.flight = 'DISPLAY';
  return {
    passId: `${hex}:100`,
    hex,
    startTime: 100,
    endTime: 200,
    aircraft,
    trackPoints: [
      { lon: 10, lat: 20, alt: 1000, ts: 100, ground: false },
      { lon: 11, lat: 21, alt: 2000, ts: 150, ground: false },
      { lon: 12, lat: 22, alt: 3000, ts: 200, ground: false },
    ],
    altitudeSummary: { hasGround: false, hasUnknown: false },
    hadAltitude: true,
    hadGround: false,
    hadEmergency: false,
    hadSquawk: false,
  };
}

function setPasses(...passes: AircraftPass[]): void {
  const store = historyStore as unknown as {
    passes: AircraftPass[];
    passById: Map<string, AircraftPass>;
  };
  store.passes = passes;
  store.passById = new Map(passes.map((value) => [value.passId, value]));
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

  it('clears aircraft markers in history mode without a selected pass', () => {
    historyStore.setFrames([frame(100, 'live-looking', 1)]);
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(100);
    usePlaybackStore.getState().setMode('history');

    render(<Harness />);

    expect(controller.syncAircraft).toHaveBeenLastCalledWith([]);
  });

  it('syncs only the selected pass aircraft', () => {
    const selectedPass = pass();
    setPasses(selectedPass);
    useSelectionStore.getState().selectPass(selectedPass.passId, selectedPass.hex);
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(100);
    usePlaybackStore.getState().setMode('history');

    render(<Harness />);

    expect(controller.syncAircraft).toHaveBeenLastCalledWith([
      expect.objectContaining({ hex: 'selected', lon: 10, lat: 20 }),
    ]);
  });

  it('updates the selected marker when the cursor moves within one effective frame', () => {
    const selectedPass = pass();
    historyStore.setFrames([frame(100, 'ignored', 1), frame(200, 'ignored', 2)]);
    setPasses(selectedPass);
    useSelectionStore.getState().selectPass(selectedPass.passId, selectedPass.hex);
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(100);
    usePlaybackStore.getState().setMode('history');
    render(<Harness />);
    (controller.syncAircraft as ReturnType<typeof vi.fn>).mockClear();

    act(() => {
      usePlaybackStore.getState().setCursor(150);
    });

    expect(controller.syncAircraft).toHaveBeenLastCalledWith([
      expect.objectContaining({ hex: 'selected', lon: 11, lat: 21 }),
    ]);
  });

  it('clears the selected marker when selection is cleared or cursor leaves the pass', () => {
    const selectedPass = pass();
    setPasses(selectedPass);
    useSelectionStore.getState().selectPass(selectedPass.passId, selectedPass.hex);
    usePlaybackStore.getState().setBounds({ min: 50, max: 250 });
    usePlaybackStore.getState().setCursor(150);
    usePlaybackStore.getState().setMode('history');
    render(<Harness />);

    act(() => usePlaybackStore.getState().setCursor(201));
    expect(controller.syncAircraft).toHaveBeenLastCalledWith([]);

    act(() => {
      usePlaybackStore.getState().setCursor(150);
      useSelectionStore.getState().clearAll();
    });

    expect(controller.syncAircraft).toHaveBeenLastCalledWith([]);
  });

  it('clears history markers on mode exit', () => {
    const selectedPass = pass();
    setPasses(selectedPass);
    useSelectionStore.getState().selectPass(selectedPass.passId, selectedPass.hex);
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(150);
    usePlaybackStore.getState().setMode('history');
    render(<Harness />);

    act(() => usePlaybackStore.getState().setMode('live'));

    expect(controller.syncAircraft).toHaveBeenLastCalledWith([]);
  });

  it('syncs again when a committed toolbar filter changes', () => {
    const selectedPass = pass();
    selectedPass.aircraft.category = 'C1';
    setPasses(selectedPass);
    useSelectionStore.getState().selectPass(selectedPass.passId, selectedPass.hex);
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(150);
    usePlaybackStore.getState().setMode('history');
    render(<Harness />);
    (controller.syncAircraft as ReturnType<typeof vi.fn>).mockClear();

    act(() => useToolbarStore.getState().toggle('filterGroundVehicles'));

    expect(controller.syncAircraft).toHaveBeenLastCalledWith([]);
  });

  it('syncs after a controller becomes ready', () => {
    const selectedPass = pass();
    setPasses(selectedPass);
    useSelectionStore.getState().selectPass(selectedPass.passId, selectedPass.hex);
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(150);
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
      expect.objectContaining({ hex: 'selected' }),
    ]);
  });

  it('recomputes markers when history generation invalidates the selected pass', () => {
    const selectedPass = pass();
    setPasses(selectedPass);
    useSelectionStore.getState().selectPass(selectedPass.passId, selectedPass.hex);
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(150);
    usePlaybackStore.getState().setMode('history');
    render(<Harness />);
    (controller.syncAircraft as ReturnType<typeof vi.fn>).mockClear();

    act(() => {
      historyStore.setFrames([frame(100, 'replacement', 1)]);
      useLiveTick.getState().bump();
    });

    expect(controller.syncAircraft).toHaveBeenLastCalledWith([]);
  });

  it('stops syncing after unmount', () => {
    const selectedPass = pass();
    setPasses(selectedPass);
    useSelectionStore.getState().selectPass(selectedPass.passId, selectedPass.hex);
    usePlaybackStore.getState().setBounds({ min: 100, max: 200 });
    usePlaybackStore.getState().setCursor(150);
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
