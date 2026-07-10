import { SearchField } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useStatsStore } from '@/store/statsStore';
import { useListControls } from '@/store/listControls';
import { usePlaybackStore } from '@/store/playbackStore';
import { useHistoryStatsStore } from '@/store/historyStatsStore';

export function CommandBar() {
  const { t } = useTranslation();
  const liveCount = useStatsStore((s) => s.count);
  const historyCount = useHistoryStatsStore((s) => s.stats?.totalPasses ?? 0);
  const mode = usePlaybackStore((s) => s.mode);
  const count = mode === 'history' ? historyCount : liveCount;
  const rate = useStatsStore((s) => s.messageRate);
  const query = useListControls((s) => s.query);
  const setQuery = useListControls((s) => s.setQuery);

  return (
    <header
      data-testid="command-bar"
      className="glass absolute left-4 right-4 top-3 flex h-11 items-center gap-3 px-4 text-white"
    >
      <span className="font-semibold">{t('commandBar.brand')}</span>
      <SearchField
        aria-label={t('commandBar.searchAircraft')}
        value={query}
        onChange={setQuery}
        variant="secondary"
        className="ml-4"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className="w-64" placeholder={t('commandBar.searchPlaceholder')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <span className="ml-auto text-sm text-slate-400">
        {t('commandBar.aircraftCount')} {count} · {Math.round(rate)} {t('commandBar.msgRate')}
      </span>
    </header>
  );
}
