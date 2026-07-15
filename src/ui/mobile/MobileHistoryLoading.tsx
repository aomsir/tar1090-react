import { Spinner } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { usePlaybackStore } from '@/store/playbackStore';

export function MobileHistoryLoading() {
  const { t } = useTranslation();
  const done = usePlaybackStore((s) => s.progress.done);
  const total = usePlaybackStore((s) => s.progress.total);
  const stage = usePlaybackStore((s) => s.historyLoadStage);

  if (stage === 'idle') return null;
  const status =
    stage === 'fetching'
      ? `${t('replay.loadingHistory')} ${done}/${total}`
      : stage === 'processing'
        ? t('replay.processingHistory')
        : t('replay.updatingTracks');

  return (
    <div
      data-testid="mobile-history-loading"
      role="status"
      aria-live="polite"
      className="glass absolute bottom-14 left-3 flex items-center gap-2 px-3 py-1.5 text-xs text-white"
    >
      <Spinner size="sm" color="current" />
      <span className="tabular-nums">{status}</span>
    </div>
  );
}
