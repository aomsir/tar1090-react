import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileToolbar } from './MobileToolbar';
import { useToolbarStore } from '@/store/toolbarStore';
import { setTestLanguage } from '@/i18n/testUtils';

describe('MobileToolbar', () => {
  beforeEach(async () => {
    await setTestLanguage('en');
    useToolbarStore.setState({ onlyMilitary: false, follow: false });
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
});
