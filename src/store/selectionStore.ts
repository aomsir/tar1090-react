import { create } from 'zustand';

interface SelectionState {
  selectedHex: string | null;
  select: (hex: string | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedHex: null,
  select: (hex) => set({ selectedHex: hex }),
}));
