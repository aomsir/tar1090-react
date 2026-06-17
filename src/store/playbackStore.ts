import { create } from 'zustand';

export type PlaybackMode = 'live' | 'history';

interface Bounds {
  min: number;
  max: number;
}

interface PlaybackState {
  mode: PlaybackMode;
  cursorTime: number;
  isPlaying: boolean;
  speed: number;
  loading: boolean;
  progress: { done: number; total: number };
  bounds: Bounds | null;
  setMode: (m: PlaybackMode) => void;
  setCursor: (t: number) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (n: number) => void;
  setLoading: (b: boolean) => void;
  setProgress: (done: number, total: number) => void;
  setBounds: (b: Bounds | null) => void;
  reset: () => void;
}

const clamp = (t: number, b: Bounds | null): number =>
  b ? Math.min(Math.max(t, b.min), b.max) : t;

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  mode: 'live',
  cursorTime: 0,
  isPlaying: false,
  speed: 4,
  loading: false,
  progress: { done: 0, total: 0 },
  bounds: null,
  setMode: (mode) => set({ mode }),
  setCursor: (t) => set({ cursorTime: clamp(t, get().bounds) }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setSpeed: (speed) => set({ speed }),
  setLoading: (loading) => set({ loading }),
  setProgress: (done, total) => set({ progress: { done, total } }),
  setBounds: (bounds) => set({ bounds }),
  reset: () =>
    set({
      mode: 'live',
      cursorTime: 0,
      isPlaying: false,
      loading: false,
      progress: { done: 0, total: 0 },
      bounds: null,
    }),
}));
