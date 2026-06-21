import { Play, Pause, History, X } from 'lucide-react';
import { Spinner } from '@heroui/react';
import { usePlaybackStore } from '@/store/playbackStore';
import { useReplay } from '@/features/playback/useReplay';
import { HISTORY_RANGES, type HistoryRange } from '@/data/historyLoader';

const SPEEDS = [1, 2, 4, 8, 16, 64];

function formatClock(tsSec: number): string {
  if (!tsSec) return '--:--:--';
  return new Date(tsSec * 1000).toLocaleTimeString('zh-CN', { hour12: false });
}

export function ReplayBar() {
  const mode = usePlaybackStore((s) => s.mode);
  const loading = usePlaybackStore((s) => s.loading);
  const progress = usePlaybackStore((s) => s.progress);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const speed = usePlaybackStore((s) => s.speed);
  const cursorTime = usePlaybackStore((s) => s.cursorTime);
  const bounds = usePlaybackStore((s) => s.bounds);
  const range = usePlaybackStore((s) => s.range);
  const rangeSelectOpen = usePlaybackStore((s) => s.rangeSelectOpen);
  const { enterHistory, exitToLive } = useReplay();

  /* Fullscreen loading overlay */
  if (loading) {
    return (
      <div
        data-testid="replay-bar"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      >
        <div className="flex flex-col items-center gap-3 text-white">
          <Spinner size="lg" color="current" />
          <span className="text-sm tabular-nums">
            Loading History… {progress.done}/{progress.total}
          </span>
        </div>
      </div>
    );
  }

  /* History playback controls */
  if (mode === 'history') {
    return (
      <footer
        data-testid="replay-bar"
        className="glass absolute bottom-3 left-4 right-4 flex h-11 items-center gap-3 px-4 text-white"
      >
        <button
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={() =>
            isPlaying ? usePlaybackStore.getState().pause() : usePlaybackStore.getState().play()
          }
          className="rounded p-1 hover:bg-white/10"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <input
          type="range"
          aria-label="Statistics panel"
          min={bounds?.min ?? 0}
          max={bounds?.max ?? 0}
          value={cursorTime}
          step={1}
          onChange={(e) => usePlaybackStore.getState().setCursor(Number(e.target.value))}
          className="flex-1 accent-sky-400"
        />
        <span className="w-20 text-xs tabular-nums text-slate-300">{formatClock(cursorTime)}</span>
        <select
          aria-label="Timeline"
          value={speed}
          onChange={(e) => usePlaybackStore.getState().setSpeed(Number(e.target.value))}
          className="rounded bg-white/10 px-1 text-xs"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
        <select
          aria-label="Speed"
          value={range}
          onChange={(e) => void enterHistory(e.target.value as HistoryRange)}
          className="rounded bg-white/10 px-1 text-xs"
        >
          {HISTORY_RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Time range"
          onClick={exitToLive}
          className="rounded p-1 hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </footer>
    );
  }

  /* Live mode: History button with inline range expansion */
  if (rangeSelectOpen) {
    return (
      <div
        data-testid="replay-bar"
        className="glass absolute bottom-3 left-4 flex items-center gap-1 px-2 py-1.5 text-xs text-white"
      >
        {HISTORY_RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            aria-label={r.label}
            onClick={() => {
              usePlaybackStore.getState().setRangeSelectOpen(false);
              void enterHistory(r.key);
            }}
            className={`rounded px-2 py-1 hover:bg-white/10 ${r.key === range ? 'bg-white/20' : ''}`}
          >
            {r.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      data-testid="replay-bar"
      type="button"
      aria-label="History"
      onClick={() => usePlaybackStore.getState().setRangeSelectOpen(true)}
      className="glass absolute bottom-3 left-4 flex items-center gap-1.5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
    >
      <History size={14} /> History
    </button>
  );
}
