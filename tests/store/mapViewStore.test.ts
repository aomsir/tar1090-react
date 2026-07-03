import { describe, it, expect, beforeEach } from 'vitest';
import { useMapViewStore } from '@/store/mapViewStore';

describe('mapViewStore', () => {
  beforeEach(() => useMapViewStore.setState({ extent: null }));

  it('stores and updates the viewport extent', () => {
    expect(useMapViewStore.getState().extent).toBeNull();
    useMapViewStore.getState().setExtent([1, 2, 3, 4]);
    expect(useMapViewStore.getState().extent).toEqual([1, 2, 3, 4]);
  });
});
