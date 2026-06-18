import { create } from 'zustand';

interface ReceiverState {
  lat?: number;
  lon?: number;
  setReceiverPosition: (lat?: number, lon?: number) => void;
}

export const useReceiverStore = create<ReceiverState>((set) => ({
  lat: undefined,
  lon: undefined,
  setReceiverPosition: (lat, lon) => set({ lat, lon }),
}));
