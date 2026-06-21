import { describe, it, expect, beforeEach } from 'vitest';
import { useToolbarStore } from './toolbarStore';

describe('toolbarStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useToolbarStore.setState(useToolbarStore.getInitialState());
  });

  it('has correct default values', () => {
    const s = useToolbarStore.getState();
    expect(s.mapDim).toBe(true);
    expect(s.fullscreen).toBe(false);
    expect(s.enableLabels).toBe(false);
    expect(s.extendedLabels).toBe(0);
    expect(s.trackLabels).toBe(false);
    expect(s.allTracks).toBe(false);
    expect(s.persistence).toBe(false);
    expect(s.isolation).toBe(false);
    expect(s.multiSelect).toBe(false);
    expect(s.inViewOnly).toBe(false);
    expect(s.onlyMilitary).toBe(false);
    expect(s.follow).toBe(false);
    expect(s.settingsOpen).toBe(false);
    expect(s.units).toBe('nautical');
    expect(s.filterGroundVehicles).toBe(false);
    expect(s.filterBlockedMLAT).toBe(false);
    expect(s.coloredPlanes).toBe(true);
    expect(s.coloredTrails).toBe(true);
    expect(s.labelScale).toBe(1);
    expect(s.iconScale).toBe(1);
  });

  it('toggles a boolean key', () => {
    useToolbarStore.getState().toggle('enableLabels');
    expect(useToolbarStore.getState().enableLabels).toBe(true);
    useToolbarStore.getState().toggle('enableLabels');
    expect(useToolbarStore.getState().enableLabels).toBe(false);
  });

  it('cycles extendedLabels 0 → 1 → 2 → 0', () => {
    const { cycleExtendedLabels } = useToolbarStore.getState();
    cycleExtendedLabels();
    expect(useToolbarStore.getState().extendedLabels).toBe(1);
    cycleExtendedLabels();
    expect(useToolbarStore.getState().extendedLabels).toBe(2);
    cycleExtendedLabels();
    expect(useToolbarStore.getState().extendedLabels).toBe(0);
  });

  it('sets units', () => {
    useToolbarStore.getState().setUnits('metric');
    expect(useToolbarStore.getState().units).toBe('metric');
  });

  it('sets scale values', () => {
    useToolbarStore.getState().setLabelScale(2);
    expect(useToolbarStore.getState().labelScale).toBe(2);
    useToolbarStore.getState().setIconScale(0.5);
    expect(useToolbarStore.getState().iconScale).toBe(0.5);
  });

  it('toggles settings panel', () => {
    useToolbarStore.getState().toggleSettings();
    expect(useToolbarStore.getState().settingsOpen).toBe(true);
    useToolbarStore.getState().toggleSettings();
    expect(useToolbarStore.getState().settingsOpen).toBe(false);
  });

  it('resets all settings to defaults', () => {
    useToolbarStore.getState().toggle('enableLabels');
    useToolbarStore.getState().setUnits('imperial');
    useToolbarStore.getState().setIconScale(2.5);
    useToolbarStore.getState().resetAll();
    const s = useToolbarStore.getState();
    expect(s.enableLabels).toBe(false);
    expect(s.units).toBe('nautical');
    expect(s.iconScale).toBe(1);
  });

  it('persists toggle state to localStorage', () => {
    useToolbarStore.getState().toggle('enableLabels');
    const stored = JSON.parse(localStorage.getItem('toolbar-settings') ?? '{}');
    expect(stored.state.enableLabels).toBe(true);
  });

  it('does not persist settingsOpen or fullscreen', () => {
    useToolbarStore.getState().toggleSettings();
    useToolbarStore.setState({ fullscreen: true });
    const stored = JSON.parse(localStorage.getItem('toolbar-settings') ?? '{}');
    expect(stored.state.settingsOpen).toBeUndefined();
    expect(stored.state.fullscreen).toBeUndefined();
  });
});

describe('detailWidth', () => {
  beforeEach(() => {
    localStorage.clear();
    useToolbarStore.setState(useToolbarStore.getInitialState());
  });

  it('defaults to 320', () => {
    useToolbarStore.getState().resetAll();
    expect(useToolbarStore.getState().detailWidth).toBe(320);
  });

  it('setDetailWidth updates the value', () => {
    useToolbarStore.getState().setDetailWidth(400);
    expect(useToolbarStore.getState().detailWidth).toBe(400);
  });

  it('clamps to minimum 280', () => {
    useToolbarStore.getState().setDetailWidth(100);
    expect(useToolbarStore.getState().detailWidth).toBe(280);
  });

  it('clamps to maximum 480', () => {
    useToolbarStore.getState().setDetailWidth(999);
    expect(useToolbarStore.getState().detailWidth).toBe(480);
  });
});
