import { useState, useRef, useEffect } from 'react';
import { Button, SearchField } from '@heroui/react';
import { List } from 'lucide-react';
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
  const [listPinned, setListPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const searchDriven = focused || query.trim().length > 0;
  const showList = (searchDriven || listPinned) && !dismissed;

  const handleSelect = (hex: string) => {
    select(hex);
    setFocused(false);
    setListPinned(false);
  };

  useEffect(() => {
    if (!showList) return;
    function handlePointerDown(event: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setDismissed(true);
        setFocused(false);
        setListPinned(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showList]);

  return (
    <header
      ref={headerRef}
      data-testid="mobile-top-bar"
      className="absolute left-3 right-3 top-3 z-10 text-white"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && query.trim().length === 0) {
          setFocused(false);
        }
      }}
    >
      <div className="glass flex h-11 items-center gap-2 px-3 [&:has(+[role=listbox])]:rounded-b-none">
        <SearchField
          aria-label={t('commandBar.searchAircraft')}
          value={query}
          onChange={(value) => {
            setDismissed(false);
            setQuery(value);
          }}
          variant="secondary"
          className="min-w-0 flex-1"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              className="min-w-0 flex-1"
              placeholder={t('commandBar.searchPlaceholder')}
              onFocus={() => {
                setFocused(true);
                setDismissed(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && showList) {
                  setFocused(false);
                  setQuery('');
                  setListPinned(false);
                }
              }}
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Button
          isIconOnly
          variant="secondary"
          aria-label={t('commandBar.showAircraftList')}
          aria-expanded={showList}
          className="h-11 w-11 shrink-0 text-slate-100"
          onPress={() => {
            if (showList) {
              setListPinned(false);
              setFocused(false);
            } else {
              setListPinned(true);
              setDismissed(false);
            }
          }}
        >
          <List size={18} />
        </Button>
        <span className="shrink-0 text-xs text-slate-400">
          {t('commandBar.aircraftCount')} {count}
        </span>
      </div>
      {showList && <MobileAircraftList onSelect={handleSelect} />}
    </header>
  );
}
