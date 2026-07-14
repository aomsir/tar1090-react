import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  normalizeHistoryTrackLimit,
  type HistoryTrackLimit,
} from '@/features/playback/historyTracks';

export type Units = 'nautical' | 'metric' | 'imperial';

export type ToggleKey =
  | 'mapDim'
  | 'enableLabels'
  | 'trackLabels'
  | 'allTracks'
  | 'persistence'
  | 'isolation'
  | 'multiSelect'
  | 'inViewOnly'
  | 'onlyMilitary'
  | 'follow'
  | 'filterGroundVehicles'
  | 'filterBlockedMLAT'
  | 'coloredPlanes'
  | 'coloredTrails';

interface ToolbarState {
  // Toggle states
  mapDim: boolean;
  fullscreen: boolean;
  enableLabels: boolean;
  extendedLabels: number;
  trackLabels: boolean;
  allTracks: boolean;
  persistence: boolean;
  isolation: boolean;
  multiSelect: boolean;
  inViewOnly: boolean;
  onlyMilitary: boolean;
  follow: boolean;

  // Settings panel
  settingsOpen: boolean;
  units: Units;
  filterGroundVehicles: boolean;
  filterBlockedMLAT: boolean;
  coloredPlanes: boolean;
  coloredTrails: boolean;
  labelScale: number;
  iconScale: number;
  detailWidth: number;
  listWidth: number;
  routeApiEnabled: boolean;
  historyTrackLimit: HistoryTrackLimit;
  altitudeFilterEnabled: boolean;
  altitudeFilterMin: number;
  altitudeFilterMax: number;

  // Actions
  toggle: (key: ToggleKey) => void;
  cycleExtendedLabels: () => void;
  setUnits: (u: Units) => void;
  setLabelScale: (v: number) => void;
  setIconScale: (v: number) => void;
  setDetailWidth: (w: number) => void;
  setListWidth: (w: number) => void;
  setRouteApiEnabled: (enabled: boolean) => void;
  setHistoryTrackLimit: (limit: HistoryTrackLimit) => void;
  setAltitudeFilterEnabled: (enabled: boolean) => void;
  setAltitudeFilterRange: (min: number, max: number) => void;
  toggleSettings: () => void;
  statsDashboardOpen: boolean;
  toggleStatsDashboard: () => void;
  resetAll: () => void;
}

const DEFAULTS = {
  mapDim: true,
  fullscreen: false,
  enableLabels: false,
  extendedLabels: 0,
  trackLabels: false,
  allTracks: false,
  persistence: false,
  isolation: false,
  multiSelect: false,
  inViewOnly: false,
  onlyMilitary: false,
  follow: false,
  settingsOpen: false,
  statsDashboardOpen: false,
  units: 'nautical' as Units,
  filterGroundVehicles: false,
  filterBlockedMLAT: false,
  coloredPlanes: true,
  coloredTrails: true,
  labelScale: 1,
  iconScale: 1,
  detailWidth: 320,
  listWidth: 384,
  routeApiEnabled: false,
  historyTrackLimit: 1000 as HistoryTrackLimit,
  altitudeFilterEnabled: false,
  altitudeFilterMin: 0,
  altitudeFilterMax: 45000,
};

const PERSISTED_TOOLBAR_KEYS = [
  'mapDim',
  'enableLabels',
  'extendedLabels',
  'trackLabels',
  'allTracks',
  'persistence',
  'isolation',
  'multiSelect',
  'inViewOnly',
  'onlyMilitary',
  'follow',
  'units',
  'filterGroundVehicles',
  'filterBlockedMLAT',
  'coloredPlanes',
  'coloredTrails',
  'labelScale',
  'iconScale',
  'detailWidth',
  'listWidth',
  'routeApiEnabled',
  'historyTrackLimit',
  'altitudeFilterEnabled',
  'altitudeFilterMin',
  'altitudeFilterMax',
] as const satisfies readonly (keyof typeof DEFAULTS)[];

type PersistedToolbarState = Pick<typeof DEFAULTS, (typeof PERSISTED_TOOLBAR_KEYS)[number]>;

function getPersistedToolbarState(state: unknown): Partial<PersistedToolbarState> {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) return {};

  const source = state as Record<string, unknown>;
  return Object.fromEntries(
    PERSISTED_TOOLBAR_KEYS.filter((key) => key in source).map((key) => [key, source[key]]),
  ) as Partial<PersistedToolbarState>;
}

export function migrateToolbarState(persisted: unknown): Record<string, unknown> {
  const state =
    typeof persisted === 'object' && persisted !== null && !Array.isArray(persisted)
      ? { ...(persisted as Record<string, unknown>) }
      : {};
  delete state.routeApiUrl;
  state.historyTrackLimit = normalizeHistoryTrackLimit(state.historyTrackLimit);
  if (state.altitudeFilterEnabled === undefined) state.altitudeFilterEnabled = false;
  if (state.altitudeFilterMin === undefined) state.altitudeFilterMin = 0;
  if (state.altitudeFilterMax === undefined) state.altitudeFilterMax = 45000;
  return state;
}

export const useToolbarStore = create<ToolbarState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      toggle: (key) => set((s) => ({ [key]: !s[key] })),
      cycleExtendedLabels: () => set((s) => ({ extendedLabels: (s.extendedLabels + 1) % 3 })),
      setUnits: (units) => set({ units }),
      setLabelScale: (labelScale) => set({ labelScale }),
      setIconScale: (iconScale) => set({ iconScale }),
      setDetailWidth: (w) => set({ detailWidth: Math.max(280, Math.min(480, w)) }),
      setListWidth: (w) => set({ listWidth: Math.max(300, Math.min(600, w)) }),
      setRouteApiEnabled: (enabled) => set({ routeApiEnabled: enabled }),
      setHistoryTrackLimit: (historyTrackLimit) =>
        set({ historyTrackLimit: normalizeHistoryTrackLimit(historyTrackLimit) }),
      setAltitudeFilterEnabled: (enabled) => set({ altitudeFilterEnabled: enabled }),
      setAltitudeFilterRange: (min, max) => set({ altitudeFilterMin: min, altitudeFilterMax: max }),
      toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
      toggleStatsDashboard: () => set((s) => ({ statsDashboardOpen: !s.statsDashboardOpen })),
      resetAll: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'toolbar-settings',
      version: 5,
      migrate: (persisted: unknown): ToolbarState =>
        migrateToolbarState(persisted) as unknown as ToolbarState,
      merge: (persisted, current) => {
        const persistedState = getPersistedToolbarState(persisted);
        return {
          ...current,
          ...persistedState,
          historyTrackLimit: normalizeHistoryTrackLimit(persistedState.historyTrackLimit),
        };
      },
      partialize: (state) => getPersistedToolbarState(state),
    },
  ),
);
