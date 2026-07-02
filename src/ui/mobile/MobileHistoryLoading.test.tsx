import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileHistoryLoading } from './MobileHistoryLoading';
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

  it('shows a fullscreen spinner with progress while history loads', () => {
    usePlaybackStore.setState({ loading: true, progress: { done: 3, total: 24 } });
    render(<MobileHistoryLoading />);
    expect(screen.getByTestId('mobile-history-loading')).toBeInTheDocument();
    expect(screen.getByText(/Loading History/)).toBeInTheDocument();
    expect(screen.getByText(/3\/24/)).toBeInTheDocument();
  });
});
