import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileHistoryLoading } from '@/ui/mobile/MobileHistoryLoading';
import { usePlaybackStore } from '@/store/playbackStore';
import { setTestLanguage } from '@/i18n/testUtils';

describe('MobileHistoryLoading', () => {
  beforeEach(async () => {
    await setTestLanguage('en');
    usePlaybackStore.getState().reset();
  });

  it('renders nothing when playback is not loading', () => {
    render(<MobileHistoryLoading />);
    expect(screen.queryByTestId('mobile-history-loading')).not.toBeInTheDocument();
  });

  it('shows inline fetching progress while history loads', () => {
    usePlaybackStore.setState({
      loading: true,
      historyLoadStage: 'fetching',
      progress: { done: 3, total: 24 },
    });
    render(<MobileHistoryLoading />);
    const status = screen.getByTestId('mobile-history-loading');
    expect(status).toBeInTheDocument();
    expect(status.className).not.toMatch(/fixed/);
    expect(screen.getByText(/Loading History/)).toBeInTheDocument();
    expect(screen.getByText(/3\/24/)).toBeInTheDocument();
  });

  it('announces loading status accessibly', () => {
    usePlaybackStore.setState({
      loading: true,
      historyLoadStage: 'fetching',
      progress: { done: 3, total: 24 },
    });
    render(<MobileHistoryLoading />);
    const overlay = screen.getByTestId('mobile-history-loading');
    expect(overlay).toHaveAttribute('role', 'status');
    expect(overlay).toHaveAttribute('aria-live', 'polite');
  });

  it('uses stage-specific processing and rendering status without progress', () => {
    usePlaybackStore.setState({ historyLoadStage: 'processing', loading: false });
    const { rerender } = render(<MobileHistoryLoading />);
    expect(screen.getByText('Processing history…')).toBeInTheDocument();
    expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument();

    usePlaybackStore.setState({ historyLoadStage: 'rendering' });
    rerender(<MobileHistoryLoading />);
    expect(screen.getByText('Updating tracks…')).toBeInTheDocument();
  });
});
