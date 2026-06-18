import { create } from 'zustand';
import { DEFAULT_HIDDEN_COLUMNS } from '@/features/list/columns';
import type { ColumnId } from '@/features/list/columns';
import type { FilterKey, SortDir, SortKey } from '@/features/list/aircraftRows';

interface ListControlsState {
  query: string;
  filter: FilterKey;
  sortKey: SortKey;
  sortDir: SortDir;
  inViewOnly: boolean;
  hiddenColumns: Set<ColumnId>;
  setQuery: (q: string) => void;
  setFilter: (f: FilterKey) => void;
  toggleSort: (key: SortKey) => void;
  setInViewOnly: (v: boolean) => void;
  toggleColumn: (id: ColumnId) => void;
  resetColumns: () => void;
}

export const useListControls = create<ListControlsState>((set) => ({
  query: '',
  filter: 'all',
  sortKey: 'altitude',
  sortDir: 'desc',
  inViewOnly: false,
  hiddenColumns: new Set(DEFAULT_HIDDEN_COLUMNS),
  setQuery: (query) => set({ query }),
  setFilter: (filter) => set({ filter }),
  setInViewOnly: (inViewOnly) => set({ inViewOnly }),
  toggleSort: (key) =>
    set((s) =>
      s.sortKey === key
        ? { sortDir: s.sortDir === 'asc' ? 'desc' : 'asc' }
        : { sortKey: key, sortDir: 'asc' },
    ),
  toggleColumn: (id) =>
    set((s) => {
      const hiddenColumns = new Set(s.hiddenColumns);
      if (hiddenColumns.has(id)) hiddenColumns.delete(id);
      else hiddenColumns.add(id);
      return { hiddenColumns };
    }),
  resetColumns: () => set({ hiddenColumns: new Set(DEFAULT_HIDDEN_COLUMNS) }),
}));
