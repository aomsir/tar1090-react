import { create } from "zustand";

interface LiveTickState {
  version: number;
  bump: () => void;
}

export const useLiveTick = create<LiveTickState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
