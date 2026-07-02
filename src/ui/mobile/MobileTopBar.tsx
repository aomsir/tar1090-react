import { SearchField } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useStatsStore } from '@/store/statsStore';
import { useListControls } from '@/store/listControls';

export function MobileTopBar() {
  const { t } = useTranslation();
  const count = useStatsStore((s) => s.count);
  const query = useListControls((s) => s.query);
  const setQuery = useListControls((s) => s.setQuery);

  return (
    <header
      data-testid="mobile-top-bar"
      className="glass absolute left-3 right-3 top-3 z-10 flex h-11 items-center gap-2 px-3 text-white"
    >
      <SearchField
        aria-label={t('commandBar.searchAircraft')}
        value={query}
        onChange={setQuery}
        variant="secondary"
        className="min-w-0 flex-1"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className="w-full" placeholder={t('commandBar.searchPlaceholder')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <span className="shrink-0 text-xs text-slate-400">
        {t('commandBar.aircraftCount')} {count}
      </span>
    </header>
  );
}
