import { Play, Pause, History, X, BarChart3 } from 'lucide-react';
import { Spinner } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { usePlaybackStore } from '@/store/playbackStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { useReplay } from '@/features/playback/useReplay';
import { HISTORY_RANGES, type HistoryRange } from '@/data/historyLoader';
import { formatTimeOfDay } from '@/i18n/format';

const SPEEDS = [1, 2, 4, 8, 16, 64];

export function ReplayBar() {
  const { t, i18n } = useTranslation();
  const mode = usePlaybackStore((s) => s.mode);
  const progress = usePlaybackStore((s) => s.progress);
  const historyLoadStage = usePlaybackStore((s) => s.historyLoadStage);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const speed = usePlaybackStore((s) => s.speed);
  const cursorTime = usePlaybackStore((s) => s.cursorTime);
  const bounds = usePlaybackStore((s) => s.bounds);
  const range = usePlaybackStore((s) => s.range);
  const rangeSelectOpen = usePlaybackStore((s) => s.rangeSelectOpen);
  const { enterHistory, exitToLive } = useReplay();

  if (historyLoadStage !== 'idle') {
    const status =
      historyLoadStage === 'fetching'
        ? `${t('replay.loadingHistory')} ${progress.done}/${progress.total}`
        : historyLoadStage === 'processing'
          ? t('replay.processingHistory')
          : t('replay.updatingTracks');
    return (
      <div
        data-testid="replay-bar"
        role="status"
        aria-live="polite"
        className="glass absolute bottom-3 left-4 flex items-center gap-2 px-3 py-1.5 text-xs text-white"
      >
        <Spinner size="sm" color="current" />
        <span className="tabular-nums">{status}</span>
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
          aria-label={isPlaying ? t('replay.pause') : t('replay.play')}
          onClick={() =>
            isPlaying ? usePlaybackStore.getState().pause() : usePlaybackStore.getState().play()
          }
          className="rounded p-1 hover:bg-white/10"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          aria-label={t('replay.statisticsPanel')}
          onClick={() => useToolbarStore.getState().toggleStatsDashboard()}
          className="rounded p-1 hover:bg-white/10"
        >
          <BarChart3 size={16} />
        </button>
        <input
          type="range"
          aria-label={t('replay.timeline')}
          min={bounds?.min ?? 0}
          max={bounds?.max ?? 0}
          value={cursorTime}
          step={1}
          onChange={(e) => usePlaybackStore.getState().setCursor(Number(e.target.value))}
          className="flex-1 accent-sky-400"
        />
        <span className="w-20 text-xs tabular-nums text-slate-300">
          {formatTimeOfDay(cursorTime, i18n.language)}
        </span>
        <select
          aria-label={t('replay.speed')}
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
          aria-label={t('replay.timeRange')}
          value={range}
          onChange={(e) => void enterHistory(e.target.value as HistoryRange)}
          className="rounded bg-white/10 px-1 text-xs"
        >
          {HISTORY_RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {t(`replay.ranges.${r.key}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={t('replay.exitReplay')}
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
        {HISTORY_RANGES.map((r) => {
          const label = t(`replay.ranges.${r.key}`);
          return (
            <button
              key={r.key}
              type="button"
              aria-label={label}
              onClick={() => {
                usePlaybackStore.getState().setRangeSelectOpen(false);
                void enterHistory(r.key);
              }}
              className={`rounded px-2 py-1 hover:bg-white/10 ${r.key === range ? 'bg-white/20' : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      data-testid="replay-bar"
      type="button"
      aria-label={t('replay.history')}
      onClick={() => usePlaybackStore.getState().setRangeSelectOpen(true)}
      className="glass absolute bottom-3 left-4 flex items-center gap-1.5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
    >
      <History size={14} /> {t('replay.history')}
    </button>
  );
}
