import { Play, Pause, History, X } from 'lucide-react';
import { usePlaybackStore } from '@/store/playbackStore';
import { useReplay } from '@/features/playback/useReplay';

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
  const { enterHistory, exitToLive } = useReplay();

  return (
    <footer
      data-testid="replay-bar"
      className="glass absolute bottom-3 left-4 right-4 flex h-11 items-center gap-3 px-4 text-white"
    >
      {loading ? (
        <span className="text-sm text-slate-300">
          Loading History… {progress.done}/{progress.total}
        </span>
      ) : mode === 'history' ? (
        <>
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={() =>
              isPlaying
                ? usePlaybackStore.getState().pause()
                : usePlaybackStore.getState().play()
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
          <span className="w-20 text-xs tabular-nums text-slate-300">
            {formatClock(cursorTime)}
          </span>
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
          <button
            type="button"
            aria-label="Speed"
            onClick={exitToLive}
            className="rounded p-1 hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void enterHistory()}
          className="flex items-center gap-1 text-sm text-slate-200 hover:text-white"
        >
          <History size={16} /> History
        </button>
      )}
    </footer>
  );
}
