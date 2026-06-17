import { create } from 'zustand';
import type { Extent } from '@/features/list/aircraftRows';

interface MapViewState {
  extent: Extent | null;
  setExtent: (extent: Extent) => void;
}

export const useMapViewStore = create<MapViewState>((set) => ({
  extent: null,
  setExtent: (extent) => set({ extent }),
}));
