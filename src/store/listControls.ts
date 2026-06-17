import { create } from 'zustand';
import type { FilterKey, SortDir, SortKey } from '@/features/list/aircraftRows';

interface ListControlsState {
  query: string;
  filter: FilterKey;
  sortKey: SortKey;
  sortDir: SortDir;
  inViewOnly: boolean;
  setQuery: (q: string) => void;
  setFilter: (f: FilterKey) => void;
  toggleSort: (key: SortKey) => void;
  setInViewOnly: (v: boolean) => void;
}

export const useListControls = create<ListControlsState>((set) => ({
  query: '',
  filter: 'all',
  sortKey: 'altitude',
  sortDir: 'desc',
  inViewOnly: false,
  setQuery: (query) => set({ query }),
  setFilter: (filter) => set({ filter }),
  setInViewOnly: (inViewOnly) => set({ inViewOnly }),
  toggleSort: (key) =>
    set((s) =>
      s.sortKey === key
        ? { sortDir: s.sortDir === 'asc' ? 'desc' : 'asc' }
        : { sortKey: key, sortDir: 'asc' },
    ),
}));
