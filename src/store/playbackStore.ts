import { create } from 'zustand';
import type { HistoryRange } from '@/data/historyLoader';

export type PlaybackMode = 'live' | 'history';
export type HistoryLoadStage = 'idle' | 'fetching' | 'processing' | 'rendering';

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
  historyLoadStage: HistoryLoadStage;
  historyLoadGeneration: number;
  bounds: Bounds | null;
  setMode: (m: PlaybackMode) => void;
  setCursor: (t: number) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (n: number) => void;
  setLoading: (b: boolean) => void;
  setProgress: (done: number, total: number) => void;
  beginHistoryLoad: () => number;
  setHistoryLoadStage: (stage: HistoryLoadStage, generation: number) => void;
  invalidateHistoryLoad: () => void;
  setBounds: (b: Bounds | null) => void;
  range: HistoryRange;
  rangeSelectOpen: boolean;
  setRange: (r: HistoryRange) => void;
  setRangeSelectOpen: (b: boolean) => void;
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
  historyLoadStage: 'idle',
  historyLoadGeneration: 0,
  bounds: null,
  range: '1d',
  rangeSelectOpen: false,
  setMode: (mode) => set({ mode }),
  setCursor: (t) => set({ cursorTime: clamp(t, get().bounds) }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setSpeed: (speed) => set({ speed }),
  setLoading: (loading) => set({ loading }),
  setProgress: (done, total) => set({ progress: { done, total } }),
  beginHistoryLoad: () => {
    const historyLoadGeneration = get().historyLoadGeneration + 1;
    set({
      historyLoadGeneration,
      historyLoadStage: 'fetching',
      loading: true,
      progress: { done: 0, total: 0 },
    });
    return historyLoadGeneration;
  },
  setHistoryLoadStage: (historyLoadStage, generation) => {
    if (generation !== get().historyLoadGeneration) return;
    set({ historyLoadStage, loading: historyLoadStage === 'fetching' });
  },
  invalidateHistoryLoad: () =>
    set((state) => ({
      historyLoadGeneration: state.historyLoadGeneration + 1,
      historyLoadStage: 'idle',
      loading: false,
      progress: { done: 0, total: 0 },
    })),
  setBounds: (bounds) => set({ bounds }),
  setRange: (range) => set({ range }),
  setRangeSelectOpen: (rangeSelectOpen) => set({ rangeSelectOpen }),
  reset: () =>
    set({
      mode: 'live',
      cursorTime: 0,
      isPlaying: false,
      loading: false,
      progress: { done: 0, total: 0 },
      historyLoadStage: 'idle',
      bounds: null,
      rangeSelectOpen: false,
    }),
}));
