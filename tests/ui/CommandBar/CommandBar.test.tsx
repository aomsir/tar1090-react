import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandBar } from '@/ui/CommandBar/CommandBar';
import { useListControls } from '@/store/listControls';
import { setTestLanguage } from '@/i18n/testUtils';
import { usePlaybackStore } from '@/store/playbackStore';
import { useHistoryStatsStore } from '@/store/historyStatsStore';

describe('CommandBar', () => {
  beforeEach(() => {
    useListControls.setState({ query: '' });
    usePlaybackStore.getState().reset();
    useHistoryStatsStore.getState().clear();
  });

  it('writes the search input into listControls.query', async () => {
    await setTestLanguage('en');
    render(<CommandBar />);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    fireEvent.change(input, { target: { value: 'CCA' } });
    expect(useListControls.getState().query).toBe('CCA');
  });

  it('shows translated brand and placeholder in zh-CN', async () => {
    await setTestLanguage('zh-CN');
    render(<CommandBar />);
    expect(screen.getByText('实时航班')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('呼号 / 注册号 / ICAO')).toBeInTheDocument();
  });

  it('shows the history pass count in history mode', async () => {
    await setTestLanguage('en');
    useHistoryStatsStore.getState().setStats({ totalPasses: 7 } as never);
    usePlaybackStore.getState().setMode('history');
    render(<CommandBar />);
    expect(screen.getByTestId('command-bar')).toHaveTextContent('Aircraft 7');
  });
});
