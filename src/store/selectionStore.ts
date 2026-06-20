import { create } from 'zustand';

interface SelectionState {
  selectedHex: string | null;
  selectedHexes: Set<string>;
  select: (hex: string | null) => void;
  toggleSelect: (hex: string) => void;
  clearAll: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedHex: null,
  selectedHexes: new Set<string>(),
  select: (hex) => set({ selectedHex: hex }),
  toggleSelect: (hex) =>
    set((s) => {
      const next = new Set(s.selectedHexes);
      if (next.has(hex)) {
        next.delete(hex);
        return { selectedHexes: next, selectedHex: next.size > 0 ? [...next].pop()! : null };
      }
      next.add(hex);
      return { selectedHexes: next, selectedHex: hex };
    }),
  clearAll: () => set({ selectedHex: null, selectedHexes: new Set() }),
}));
