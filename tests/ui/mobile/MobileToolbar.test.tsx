import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileToolbar } from '@/ui/mobile/MobileToolbar';
import { useToolbarStore } from '@/store/toolbarStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { setTestLanguage } from '@/i18n/testUtils';

const enterHistory = vi.fn().mockResolvedValue(undefined);
const exitToLive = vi.fn();
vi.mock('@/features/playback/useReplay', () => ({
  useReplay: () => ({ enterHistory, exitToLive }),
}));

describe('MobileToolbar', () => {
  beforeEach(async () => {
    await setTestLanguage('en');
    useToolbarStore.setState({ onlyMilitary: false, follow: false });
    usePlaybackStore.getState().reset();
    enterHistory.mockClear();
    exitToLive.mockClear();
  });

  it('calls onResetView when reset button pressed', () => {
    const onResetView = vi.fn();
    render(<MobileToolbar onResetView={onResetView} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset map view' }));
    expect(onResetView).toHaveBeenCalledOnce();
  });

  it('toggles onlyMilitary in toolbarStore', () => {
    render(<MobileToolbar onResetView={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Only military aircraft' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn);
    expect(useToolbarStore.getState().onlyMilitary).toBe(true);
  });

  it('toggles follow in toolbarStore and reflects pressed state', () => {
    useToolbarStore.setState({ follow: true });
    render(<MobileToolbar onResetView={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Follow selected aircraft' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(btn);
    expect(useToolbarStore.getState().follow).toBe(false);
  });

  it('anchors the toolbar to the bottom right beside the altitude legend', () => {
    render(<MobileToolbar onResetView={() => {}} />);
    const toolbar = screen.getByTestId('mobile-toolbar');
    expect(toolbar).toHaveClass('right-3');
    expect(toolbar).toHaveClass('bottom-[3.75rem]');
    expect(toolbar).toHaveClass('flex-col');
    expect(toolbar).not.toHaveClass('top-28');
    expect(toolbar).not.toHaveClass('top-16');
    expect(toolbar).not.toHaveClass('flex-row');
  });

  it('enters 1-day history when the history button is pressed in live mode', () => {
    render(<MobileToolbar onResetView={() => {}} />);
    const btn = screen.getByRole('button', { name: 'History' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn);
    expect(enterHistory).toHaveBeenCalledWith('1d');
    expect(exitToLive).not.toHaveBeenCalled();
  });

  it('exits to live when the history button is pressed in history mode', () => {
    usePlaybackStore.setState({ mode: 'history' });
    render(<MobileToolbar onResetView={() => {}} />);
    const btn = screen.getByRole('button', { name: 'History' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(btn);
    expect(exitToLive).toHaveBeenCalledOnce();
    expect(enterHistory).not.toHaveBeenCalled();
  });
});
