import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

  // Actions
  toggle: (key: ToggleKey) => void;
  cycleExtendedLabels: () => void;
  setUnits: (u: Units) => void;
  setLabelScale: (v: number) => void;
  setIconScale: (v: number) => void;
  toggleSettings: () => void;
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
  units: 'nautical' as Units,
  filterGroundVehicles: false,
  filterBlockedMLAT: false,
  coloredPlanes: true,
  coloredTrails: true,
  labelScale: 1,
  iconScale: 1,
};

export const useToolbarStore = create<ToolbarState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      toggle: (key) => set((s) => ({ [key]: !s[key] })),
      cycleExtendedLabels: () =>
        set((s) => ({ extendedLabels: (s.extendedLabels + 1) % 3 })),
      setUnits: (units) => set({ units }),
      setLabelScale: (labelScale) => set({ labelScale }),
      setIconScale: (iconScale) => set({ iconScale }),
      toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
      resetAll: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'toolbar-settings',
      partialize: (state) => {
        // Exclude transient UI state from persistence
        const { settingsOpen: _sf, fullscreen: _fs, ...persisted } = state; // eslint-disable-line @typescript-eslint/no-unused-vars
        return persisted;
      },
    },
  ),
);
