import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_HIDDEN_COLUMNS } from '@/features/list/columns';
import { useListControls } from './listControls';

describe('listControls', () => {
  beforeEach(() =>
    useListControls.setState({
      query: '',
      filter: 'all',
      sortKey: 'altitude',
      sortDir: 'desc',
      inViewOnly: false,
    }),
  );

  it('sets query, filter and in-view toggle', () => {
    useListControls.getState().setQuery('AB');
    useListControls.getState().setFilter('military');
    useListControls.getState().setInViewOnly(true);
    const s = useListControls.getState();
    expect(s.query).toBe('AB');
    expect(s.filter).toBe('military');
    expect(s.inViewOnly).toBe(true);
  });

  it('toggleSort flips direction on same key and resets to asc on new key', () => {
    useListControls.getState().toggleSort('altitude');
    expect(useListControls.getState().sortDir).toBe('asc');
    useListControls.getState().toggleSort('flight');
    expect(useListControls.getState().sortKey).toBe('flight');
    expect(useListControls.getState().sortDir).toBe('asc');
    useListControls.getState().toggleSort('flight');
    expect(useListControls.getState().sortDir).toBe('desc');
  });
});

describe('useListControls column visibility', () => {
  beforeEach(() => {
    useListControls.getState().resetColumns();
  });

  it('starts with original tar1090 hidden columns', () => {
    expect([...useListControls.getState().hiddenColumns]).toEqual(DEFAULT_HIDDEN_COLUMNS);
  });

  it('toggles one column without changing other controls', () => {
    useListControls.getState().toggleColumn('icao');
    expect(useListControls.getState().hiddenColumns.has('icao')).toBe(false);
    useListControls.getState().toggleColumn('icao');
    expect(useListControls.getState().hiddenColumns.has('icao')).toBe(true);
  });
});
