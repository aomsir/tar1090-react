import { Spinner } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { usePlaybackStore } from '@/store/playbackStore';

export function MobileHistoryLoading() {
  const { t } = useTranslation();
  const loading = usePlaybackStore((s) => s.loading);
  const done = usePlaybackStore((s) => s.progress.done);
  const total = usePlaybackStore((s) => s.progress.total);

  if (!loading) return null;

  return (
    <div
      data-testid="mobile-history-loading"
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="flex flex-col items-center gap-3 text-white">
        <Spinner size="lg" color="current" />
        <span className="text-sm tabular-nums">
          {t('replay.loadingHistory')} {done}/{total}
        </span>
      </div>
    </div>
  );
}
