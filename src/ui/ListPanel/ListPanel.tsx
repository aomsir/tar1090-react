import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Chip } from '@heroui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { useAircraftRows } from '@/features/list/useAircraftRows';
import { createListColumns } from '@/features/list/columns';
import { useListControls } from '@/store/listControls';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { altitudeColor, hslString } from '@/domain/altitude';
import type { AircraftRow, FilterKey, SortKey } from '@/features/list/aircraftRows';
import type { ListColumn } from '@/features/list/columns';

const EMERGENCY_SQUAWKS = new Set(['7500', '7600', '7700']);
const ROW_HEIGHT = 32;
const ROW_OVERSCAN = 10;

function rowBackground(row: AircraftRow, selected: boolean, index: number): string {
  if (EMERGENCY_SQUAWKS.has(row.squawk)) return 'bg-red-500/25';
  if (selected) return 'border-l-[3px] border-indigo-400 bg-indigo-500/12';
  if (row.isMlat) return 'bg-amber-400/10';
  return index % 2 === 0 ? 'bg-white/[0.03]' : '';
}

export function ListPanel({ onSelect }: { onSelect: (rowId: string) => void }) {
  const { t, i18n } = useTranslation();
  const rows = useAircraftRows();
  const filter = useListControls((s) => s.filter);
  const setFilter = useListControls((s) => s.setFilter);
  const sortKey = useListControls((s) => s.sortKey);
  const sortDir = useListControls((s) => s.sortDir);
  const toggleSort = useListControls((s) => s.toggleSort);
  const inViewOnly = useToolbarStore((s) => s.inViewOnly);
  const selectedHex = useSelectionStore((s) => s.selectedHex);
  const selectedPassId = useSelectionStore((s) => s.selectedPassId);
  const hiddenColumns = useListControls((s) => s.hiddenColumns);
  const toggleColumn = useListControls((s) => s.toggleColumn);
  const isHistory = usePlaybackStore((s) => s.mode) === 'history';
  const listWidth = useToolbarStore((s) => s.listWidth);
  const setListWidth = useToolbarStore((s) => s.setListWidth);
  const isDragging = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => createListColumns(t, i18n.language), [t, i18n.language]);
  const filters = useMemo<{ id: FilterKey; label: string }[]>(
    () => [
      { id: 'all', label: t('list.filters.all') },
      { id: 'airborne', label: t('list.filters.airborne') },
      { id: 'ground', label: t('list.filters.ground') },
      { id: 'military', label: t('list.filters.military') },
    ],
    [t],
  );
  const modeColumns = columns.filter((c) => isHistory || c.id !== 'pass_time');
  const visibleColumns = modeColumns.filter((c) => !hiddenColumns.has(c.id));
  const tableColumnCount = Math.max(visibleColumns.length, 1);
  const columnOptionsRef = useRef<HTMLDetailsElement>(null);
  // TanStack owns the scroll subscription and does not support React Compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: ROW_OVERSCAN,
    getItemKey: (index) => rows[index]!.rowId,
    initialRect: { width: 640, height: 320 },
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const topPadding = virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const bottomPadding =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end
      : 0;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      const startX = e.clientX;
      const startWidth = listWidth;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = startX - ev.clientX;
        setListWidth(startWidth + delta);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        cleanupRef.current = null;
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      cleanupRef.current = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    },
    [listWidth, setListWidth],
  );

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const historyLabel = (col: ListColumn): string => {
    if (!isHistory) return col.label;
    if (col.id === 'altitude') return t('list.history.maxAltitude');
    if (col.id === 'speed') return t('list.history.maxSpeed');
    if (col.id === 'distance') return t('list.history.maxDistance');
    return col.label;
  };

  return (
    <aside
      data-testid="list-panel"
      className="glass relative flex h-full min-h-0 flex-col p-3 text-white"
      style={{ width: `${listWidth}px` }}
    >
      <div
        data-testid="list-resize-handle"
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center group"
      >
        <div className="h-8 w-1 rounded-full bg-white/20 group-hover:bg-white/50 transition-opacity" />
      </div>
      <div
        className="flex gap-1 rounded-md bg-white/5 p-0.5"
        role="tablist"
        aria-label={t('list.filters.ariaLabel')}
      >
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
              filter === f.id ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label className="text-muted mt-2 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={inViewOnly}
          onChange={() => useToolbarStore.getState().toggle('inViewOnly')}
        />
        {t('list.inViewOnly')}
      </label>

      <div className="mt-2">
        <details ref={columnOptionsRef}>
          <summary className="cursor-pointer text-xs text-slate-400 hover:text-white">
            {t('list.columnOptions')}
          </summary>
          <div className="mt-1 flex flex-wrap gap-1">
            {modeColumns.map((c) => {
              const checked = !hiddenColumns.has(c.id);
              const label = c.id === 'flag' ? t('list.flag') : historyLabel(c);
              return (
                <label key={c.id} className="flex items-center gap-1 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={checked}
                    aria-label={label}
                    onChange={() => toggleColumn(c.id)}
                  />
                  {label}
                  {c.id === 'route' && (
                    <span className="text-slate-500">{t('list.referenceOnly')}</span>
                  )}
                </label>
              );
            })}
          </div>
        </details>
        <button
          type="button"
          aria-label={t('list.columns')}
          className="sr-only"
          onClick={() => {
            if (columnOptionsRef.current)
              columnOptionsRef.current.open = !columnOptionsRef.current.open;
          }}
        >
          {t('list.columns')}
        </button>
      </div>

      <div
        ref={scrollRef}
        data-testid="list-scroll-region"
        className="mt-2 min-h-0 flex-1 overflow-auto"
      >
        <table className="min-w-[640px] w-full border-separate border-spacing-0 text-[13px]">
          <thead className="sticky top-0 z-10 bg-zinc-950">
            <tr className="border-b border-white/10 text-[12px] text-slate-500">
              {visibleColumns.map((c) => {
                const sortable = c.id !== 'flag';
                const isActive = sortKey === c.id;
                const align = c.align ?? 'left';
                return (
                  <th
                    key={c.id}
                    role="columnheader"
                    aria-sort={
                      isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={`px-2 py-1.5 ${align === 'right' ? 'text-right' : 'text-left'} ${isActive ? 'border-b-2 border-white/25' : ''}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className="hover:text-white"
                        onClick={() => toggleSort(c.id as SortKey)}
                      >
                        {historyLabel(c)}
                        {isActive ? (sortDir === 'asc' ? ' ▴' : ' ▾') : ''}
                      </button>
                    ) : (
                      <span>{c.id === 'flag' ? t('list.flag') : historyLabel(c)}</span>
                    )}
                  </th>
                );
              })}
              {visibleColumns.length === 0 ? <th aria-hidden="true" /> : null}
            </tr>
          </thead>
          <tbody>
            {topPadding > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={tableColumnCount} style={{ height: `${topPadding}px`, padding: 0 }} />
              </tr>
            ) : null}
            {virtualRows.map((virtualRow) => {
              const r = rows[virtualRow.index]!;
              const selected = isHistory ? selectedPassId === r.passId : r.hex === selectedHex;
              return (
                <tr
                  key={r.rowId}
                  data-testid={`row-${r.rowId}`}
                  data-index={virtualRow.index}
                  onClick={() => onSelect(r.rowId)}
                  style={{ height: `${ROW_HEIGHT}px` }}
                  className={`cursor-pointer transition-colors duration-150 hover:bg-white/10 ${rowBackground(r, selected, virtualRow.index)}`}
                >
                  {visibleColumns.map((c) => {
                    const align = c.align ?? 'left';
                    if (c.id === 'flag') {
                      return (
                        <td
                          key={c.id}
                          className="h-8 px-2 py-0 align-middle leading-4 whitespace-nowrap"
                        >
                          <span className="flex h-8 w-4 shrink-0 items-center justify-center">
                            {r.flagPath ? (
                              <img src={r.flagPath} alt="" className="h-2.5 w-4 object-cover" />
                            ) : (
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: hslString(altitudeColor(r.altitude)) }}
                              />
                            )}
                          </span>
                        </td>
                      );
                    }
                    const value = c.format(r);
                    const isNumeric = c.align === 'right';
                    const cellClass = [
                      'h-8 px-2 py-0 align-middle leading-4 whitespace-nowrap',
                      align === 'right' ? 'text-right' : 'text-left',
                      isNumeric ? 'font-mono text-xs' : '',
                      c.id === 'flight' ? 'font-medium' : '',
                      !value || value === '—' ? 'text-slate-500' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <td key={c.id} className={cellClass} {...(value ? { title: value } : {})}>
                        <span
                          className={`flex h-8 items-center whitespace-nowrap ${
                            c.id === 'flight'
                              ? 'min-w-max gap-1'
                              : align === 'right'
                                ? 'justify-end'
                                : ''
                          }`}
                        >
                          {c.id === 'aircraft_type' && value && value !== '—' ? (
                            <span className="rounded bg-white/[0.08] px-1.5 text-xs">{value}</span>
                          ) : (
                            value || '—'
                          )}
                          {c.id === 'flight' && r.isMilitary ? (
                            <Chip size="sm" color="danger" variant="soft" className="scale-75">
                              MIL
                            </Chip>
                          ) : null}
                          {c.id === 'flight' && r.isMlat ? (
                            <Chip size="sm" color="warning" variant="soft" className="scale-75">
                              MLAT
                            </Chip>
                          ) : null}
                        </span>
                      </td>
                    );
                  })}
                  {visibleColumns.length === 0 ? <td aria-hidden="true" /> : null}
                </tr>
              );
            })}
            {bottomPadding > 0 ? (
              <tr aria-hidden="true">
                <td
                  colSpan={tableColumnCount}
                  style={{ height: `${bottomPadding}px`, padding: 0 }}
                />
              </tr>
            ) : null}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="text-muted px-1 py-2 text-[13px]">{t('list.emptyState')}</div>
        ) : null}
      </div>
    </aside>
  );
}
