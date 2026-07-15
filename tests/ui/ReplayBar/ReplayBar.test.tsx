import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithI18n } from '@/i18n/testUtils';
import { ReplayBar } from '@/ui/ReplayBar/ReplayBar';
import { usePlaybackStore } from '@/store/playbackStore';
import { historyStore } from '@/store/historyStore';
import type { AircraftSnapshot } from '@/data/types';

vi.mock('@/data/historyLoader', () => ({
  historyLoader: {
    ensureLoaded: vi.fn(async (onProgress?: (p: { done: number; total: number }) => void) => {
      historyStore.setFrames([
        { now: 100, messages: 0, aircraft: [] as unknown as AircraftSnapshot['aircraft'] },
        { now: 200, messages: 0, aircraft: [] as unknown as AircraftSnapshot['aircraft'] },
      ]);
      onProgress?.({ done: 2, total: 2 });
    }),
    reset: vi.fn(),
  },
  HISTORY_RANGES: [
    { key: '1d', seconds: 86400 },
    { key: '3d', seconds: 259200 },
    { key: '1w', seconds: 604800 },
    { key: '1m', seconds: 2592000 },
    { key: 'unlimited', seconds: Infinity },
  ],
}));

describe('ReplayBar', () => {
  beforeEach(() => {
    usePlaybackStore.getState().reset();
    historyStore.reset();
  });

  it('shows a compact history entry button in live mode without a full-width bar', async () => {
    await renderWithI18n(<ReplayBar />);
    const btn = screen.getByRole('button', { name: /history/i });
    expect(btn).toBeInTheDocument();
    // Button itself is the replay-bar root — not wrapped in a full-width footer
    expect(btn).toHaveAttribute('data-testid', 'replay-bar');
    expect(btn.tagName).toBe('BUTTON');
    expect(screen.queryByText('All')).not.toBeInTheDocument();
  });

  it('clicking History expands inline range options instead of loading immediately', async () => {
    await renderWithI18n(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    // Should show range option buttons, not loading overlay
    expect(screen.getByRole('button', { name: '1 day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    // Not loading yet
    expect(usePlaybackStore.getState().loading).toBe(false);
  });

  it('selecting a range option triggers enterHistory and collapses', async () => {
    await renderWithI18n(<ReplayBar />);
    // Expand
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    fireEvent.click(screen.getByRole('button', { name: '1 day' }));
    await waitFor(() => expect(usePlaybackStore.getState().mode).toBe('history'));
    // Inline options should be gone (now showing replay controls)
    expect(screen.queryByRole('button', { name: '3 days' })).not.toBeInTheDocument();
  });

  it('enters history mode after selecting a range', async () => {
    await renderWithI18n(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    fireEvent.click(screen.getByRole('button', { name: '1 day' }));
    await waitFor(() => expect(usePlaybackStore.getState().mode).toBe('history'));
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('scrubbing the slider updates cursorTime', async () => {
    await renderWithI18n(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    fireEvent.click(screen.getByRole('button', { name: '1 day' }));
    await waitFor(() => expect(screen.queryByRole('slider')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('slider'), { target: { value: '150' } });
    expect(usePlaybackStore.getState().cursorTime).toBe(150);
  });

  it('exits back to live mode', async () => {
    await renderWithI18n(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    fireEvent.click(screen.getByRole('button', { name: '1 day' }));
    await waitFor(() => expect(usePlaybackStore.getState().mode).toBe('history'));
    fireEvent.click(screen.getByRole('button', { name: /Exit replay/ }));
    expect(usePlaybackStore.getState().mode).toBe('live');
  });

  it('shows a range selector in history mode replay bar', async () => {
    await renderWithI18n(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    fireEvent.click(screen.getByRole('button', { name: '1 day' }));
    await waitFor(() => expect(usePlaybackStore.getState().mode).toBe('history'));
    const rangeSelect = screen.getByRole('combobox', { name: 'Time range' });
    expect(rangeSelect).toBeInTheDocument();
    expect(rangeSelect).toHaveValue('1d');
  });

  it('switching range select reloads history with new range', async () => {
    const { historyLoader } = await import('@/data/historyLoader');
    await renderWithI18n(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    fireEvent.click(screen.getByRole('button', { name: '1 day' }));
    await waitFor(() => expect(usePlaybackStore.getState().mode).toBe('history'));
    vi.mocked(historyLoader.reset).mockClear();
    vi.mocked(historyLoader.ensureLoaded).mockClear();
    fireEvent.change(screen.getByRole('combobox', { name: 'Time range' }), {
      target: { value: '1w' },
    });
    await waitFor(() => expect(usePlaybackStore.getState().range).toBe('1w'));
    expect(historyLoader.reset).toHaveBeenCalled();
    expect(historyLoader.ensureLoaded).toHaveBeenCalledWith(expect.any(Function), '1w');
    // Still in history mode
    expect(usePlaybackStore.getState().mode).toBe('history');
  });

  it('re-selecting same range in history mode does not reload', async () => {
    const { historyLoader } = await import('@/data/historyLoader');
    await renderWithI18n(<ReplayBar />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    fireEvent.click(screen.getByRole('button', { name: '1 day' }));
    await waitFor(() => expect(usePlaybackStore.getState().mode).toBe('history'));
    vi.mocked(historyLoader.reset).mockClear();
    vi.mocked(historyLoader.ensureLoaded).mockClear();
    fireEvent.change(screen.getByRole('combobox', { name: 'Time range' }), {
      target: { value: '1d' },
    });
    // Same range — guard should prevent reload
    expect(historyLoader.reset).not.toHaveBeenCalled();
    expect(historyLoader.ensureLoaded).not.toHaveBeenCalled();
  });

  it('shows fetching progress without blocking the screen', async () => {
    usePlaybackStore.setState({
      loading: true,
      historyLoadStage: 'fetching',
      progress: { done: 42, total: 100 },
    });
    await renderWithI18n(<ReplayBar />);
    const overlay = screen.getByTestId('replay-bar');
    expect(overlay.className).not.toMatch(/fixed/);
    expect(overlay.className).not.toMatch(/inset-0/);
    expect(screen.getByText(/42\/100/)).toBeInTheDocument();
    expect(screen.getByText(/Loading History/)).toBeInTheDocument();
  });

  it('replaces fetch progress with processing and rendering status', async () => {
    usePlaybackStore.setState({ historyLoadStage: 'processing', loading: false });
    await renderWithI18n(<ReplayBar />);
    expect(screen.getByText('Processing history…')).toBeInTheDocument();
    expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument();

    act(() => usePlaybackStore.setState({ historyLoadStage: 'rendering' }));
    expect(screen.getByText('Updating tracks…')).toBeInTheDocument();
  });

  it('renders translated replay UI text in zh-CN', async () => {
    await renderWithI18n(<ReplayBar />, { language: 'zh-CN' });

    // Live mode: History entry button uses translated aria-label
    expect(screen.getByRole('button', { name: '历史回放' })).toBeInTheDocument();

    // Expand inline range options — labels are translated
    fireEvent.click(screen.getByRole('button', { name: '历史回放' }));
    expect(screen.getByRole('button', { name: '1 天' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 天' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 周' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 个月' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();

    // Enter history mode — controls use translated aria-labels
    fireEvent.click(screen.getByRole('button', { name: '1 天' }));
    await waitFor(() => expect(usePlaybackStore.getState().mode).toBe('history'));
    expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '统计面板' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: '时间轴' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '速度' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '时间范围' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '退出回放' })).toBeInTheDocument();
  });

  it('renders a translated loading overlay in zh-CN', async () => {
    usePlaybackStore.setState({
      loading: true,
      historyLoadStage: 'fetching',
      progress: { done: 42, total: 100 },
    });
    await renderWithI18n(<ReplayBar />, { language: 'zh-CN' });
    expect(screen.getByText(/正在加载历史/)).toBeInTheDocument();
    expect(screen.getByText(/42\/100/)).toBeInTheDocument();
  });
});
