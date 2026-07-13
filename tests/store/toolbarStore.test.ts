import { describe, it, expect, beforeEach } from 'vitest';
import { migrateToolbarState, useToolbarStore } from '@/store/toolbarStore';

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

  it('defaults historyTrackLimit to 1000 and persists changes', () => {
    expect(useToolbarStore.getState().historyTrackLimit).toBe(1000);

    useToolbarStore.getState().setHistoryTrackLimit(5000);

    expect(useToolbarStore.getState().historyTrackLimit).toBe(5000);
    const stored = JSON.parse(localStorage.getItem('toolbar-settings') ?? '{}');
    expect(stored.state.historyTrackLimit).toBe(5000);
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

  it('resetAll restores historyTrackLimit to 1000', () => {
    useToolbarStore.getState().setHistoryTrackLimit('all');
    useToolbarStore.getState().resetAll();

    expect(useToolbarStore.getState().historyTrackLimit).toBe(1000);
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

  it.each([
    [{}, 1000],
    [{ historyTrackLimit: 500 }, 500],
    [{ historyTrackLimit: 'all' }, 'all'],
    [{ historyTrackLimit: 1234 }, 1000],
    [{ historyTrackLimit: 'invalid' }, 1000],
  ] as const)('normalizes migrated historyTrackLimit %#', (persisted, expected) => {
    expect(migrateToolbarState(persisted).historyTrackLimit).toBe(expected);
  });

  it('removes legacy routeApiUrl while preserving persisted toolbar fields', () => {
    expect(
      migrateToolbarState({
        routeApiUrl: 'https://legacy.example',
        units: 'metric',
        enableLabels: true,
      }),
    ).toMatchObject({
      units: 'metric',
      enableLabels: true,
      historyTrackLimit: 1000,
    });
    expect(
      migrateToolbarState({ routeApiUrl: 'https://legacy.example' }).routeApiUrl,
    ).toBeUndefined();
  });

  it('normalizes an invalid current-version historyTrackLimit during hydration', async () => {
    localStorage.setItem(
      'toolbar-settings',
      JSON.stringify({ state: { historyTrackLimit: 1234 }, version: 5 }),
    );

    await useToolbarStore.persist.rehydrate();

    expect(useToolbarStore.getState().historyTrackLimit).toBe(1000);
  });

  it('preserves a valid current-version historyTrackLimit during hydration', async () => {
    localStorage.setItem(
      'toolbar-settings',
      JSON.stringify({ state: { historyTrackLimit: 'all' }, version: 5 }),
    );

    await useToolbarStore.persist.rehydrate();

    expect(useToolbarStore.getState().historyTrackLimit).toBe('all');
  });

  it('hydrates only persisted toolbar fields from current-version storage', async () => {
    localStorage.setItem(
      'toolbar-settings',
      JSON.stringify({
        state: {
          historyTrackLimit: 500,
          units: 'metric',
          settingsOpen: true,
          fullscreen: true,
          statsDashboardOpen: true,
          toggle: 'corrupted action',
          unexpected: 'ignored',
        },
        version: 5,
      }),
    );

    await useToolbarStore.persist.rehydrate();

    const state = useToolbarStore.getState();
    expect(state.historyTrackLimit).toBe(500);
    expect(state.units).toBe('metric');
    expect(state.settingsOpen).toBe(false);
    expect(state.fullscreen).toBe(false);
    expect(state.statsDashboardOpen).toBe(false);
    expect(state.toggle).toBeTypeOf('function');
    expect('unexpected' in state).toBe(false);
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

describe('routeApi settings', () => {
  beforeEach(() => {
    localStorage.clear();
    useToolbarStore.setState(useToolbarStore.getInitialState());
  });

  it('defaults routeApiEnabled to false', () => {
    expect(useToolbarStore.getState().routeApiEnabled).toBe(false);
  });

  it('setRouteApiEnabled toggles the flag', () => {
    useToolbarStore.getState().setRouteApiEnabled(true);
    expect(useToolbarStore.getState().routeApiEnabled).toBe(true);
    useToolbarStore.getState().setRouteApiEnabled(false);
    expect(useToolbarStore.getState().routeApiEnabled).toBe(false);
  });

  it('resetAll restores route defaults', () => {
    useToolbarStore.getState().setRouteApiEnabled(true);
    useToolbarStore.getState().resetAll();
    expect(useToolbarStore.getState().routeApiEnabled).toBe(false);
  });
});

describe('altitude filter', () => {
  beforeEach(() => {
    localStorage.clear();
    useToolbarStore.setState(useToolbarStore.getInitialState());
  });

  it('defaults altitudeFilterEnabled to false, min to 0, max to 45000', () => {
    const s = useToolbarStore.getState();
    expect(s.altitudeFilterEnabled).toBe(false);
    expect(s.altitudeFilterMin).toBe(0);
    expect(s.altitudeFilterMax).toBe(45000);
  });

  it('setAltitudeFilterEnabled toggles the flag', () => {
    useToolbarStore.getState().setAltitudeFilterEnabled(true);
    expect(useToolbarStore.getState().altitudeFilterEnabled).toBe(true);
    useToolbarStore.getState().setAltitudeFilterEnabled(false);
    expect(useToolbarStore.getState().altitudeFilterEnabled).toBe(false);
  });

  it('setAltitudeFilterRange updates min and max', () => {
    useToolbarStore.getState().setAltitudeFilterRange(5000, 25000);
    expect(useToolbarStore.getState().altitudeFilterMin).toBe(5000);
    expect(useToolbarStore.getState().altitudeFilterMax).toBe(25000);
  });

  it('resetAll restores altitude filter defaults', () => {
    useToolbarStore.getState().setAltitudeFilterEnabled(true);
    useToolbarStore.getState().setAltitudeFilterRange(5000, 25000);
    useToolbarStore.getState().resetAll();

    const s = useToolbarStore.getState();
    expect(s.altitudeFilterEnabled).toBe(false);
    expect(s.altitudeFilterMin).toBe(0);
    expect(s.altitudeFilterMax).toBe(45000);
  });

  it('persists altitude filter fields to localStorage', () => {
    useToolbarStore.getState().setAltitudeFilterEnabled(true);
    useToolbarStore.getState().setAltitudeFilterRange(1000, 10000);

    const stored = JSON.parse(localStorage.getItem('toolbar-settings') ?? '{}');
    expect(stored.state.altitudeFilterEnabled).toBe(true);
    expect(stored.state.altitudeFilterMin).toBe(1000);
    expect(stored.state.altitudeFilterMax).toBe(10000);
  });

  it('migrates v4 storage missing altitude filter fields', () => {
    const migrated = migrateToolbarState({ units: 'metric' });
    expect(migrated.altitudeFilterEnabled).toBe(false);
    expect(migrated.altitudeFilterMin).toBe(0);
    expect(migrated.altitudeFilterMax).toBe(45000);
  });
});
