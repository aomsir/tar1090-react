import { describe, it, expect, beforeEach } from 'vitest';
import { useStatsStore } from './statsStore';

describe('statsStore', () => {
  beforeEach(() => {
    useStatsStore.setState({ count: 0, messages: 0, messageRate: 0, now: 0 });
  });

  it('starts at zero', () => {
    expect(useStatsStore.getState().count).toBe(0);
  });

  it('setStats replaces the live stats', () => {
    useStatsStore.getState().setStats({ count: 5, messages: 100, messageRate: 12.5, now: 42 });
    const s = useStatsStore.getState();
    expect(s.count).toBe(5);
    expect(s.messageRate).toBe(12.5);
  });
});
