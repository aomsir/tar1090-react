import { useState } from 'react';
import { SearchField } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useStatsStore } from '@/store/statsStore';
import { useListControls } from '@/store/listControls';
import { useSelectionStore } from '@/store/selectionStore';
import { MobileAircraftList } from './MobileAircraftList';

export function MobileTopBar() {
  const { t } = useTranslation();
  const count = useStatsStore((s) => s.count);
  const query = useListControls((s) => s.query);
  const setQuery = useListControls((s) => s.setQuery);
  const select = useSelectionStore((s) => s.select);
  const [focused, setFocused] = useState(false);
  const showList = focused || query.trim().length > 0;

  const handleSelect = (hex: string) => {
    select(hex);
    setFocused(false);
  };

  return (
    <header
      data-testid="mobile-top-bar"
      className="absolute left-3 right-3 top-3 z-10 text-white"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && query.trim().length === 0) {
          setFocused(false);
        }
      }}
    >
      <div className="glass flex h-11 items-center gap-2 px-3">
        <SearchField
          aria-label={t('commandBar.searchAircraft')}
          value={query}
          onChange={setQuery}
          variant="secondary"
          className="min-w-0 flex-1"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              className="min-w-0 flex-1"
              placeholder={t('commandBar.searchPlaceholder')}
              onFocus={() => setFocused(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && showList) {
                  setFocused(false);
                  setQuery('');
                }
              }}
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <span className="shrink-0 text-xs text-slate-400">
          {t('commandBar.aircraftCount')} {count}
        </span>
      </div>
      {showList && <MobileAircraftList onSelect={handleSelect} />}
    </header>
  );
}
