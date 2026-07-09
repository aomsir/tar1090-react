import { create } from 'zustand';

interface SelectionState {
  selectedHex: string | null;
  selectedPassId: string | null;
  selectedHexes: Set<string>;
  select: (hex: string | null) => void;
  selectPass: (passId: string, hex: string) => void;
  toggleSelect: (hex: string) => void;
  clearAll: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedHex: null,
  selectedPassId: null,
  selectedHexes: new Set<string>(),
  select: (hex) => set({ selectedHex: hex, selectedPassId: null }),
  selectPass: (passId, hex) => set({ selectedPassId: passId, selectedHex: hex }),
  toggleSelect: (hex) =>
    set((s) => {
      const next = new Set(s.selectedHexes);
      if (next.has(hex)) {
        next.delete(hex);
        return {
          selectedHexes: next,
          selectedHex: next.size > 0 ? [...next].pop()! : null,
          selectedPassId: null,
        };
      }
      next.add(hex);
      return { selectedHexes: next, selectedHex: hex, selectedPassId: null };
    }),
  clearAll: () => set({ selectedHex: null, selectedPassId: null, selectedHexes: new Set() }),
}));
