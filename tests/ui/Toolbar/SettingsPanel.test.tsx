import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '@/ui/Toolbar/SettingsPanel';
import { useToolbarStore } from '@/store/toolbarStore';
import { renderWithI18n } from '@/i18n/testUtils';
import i18n from '@/i18n';

describe('SettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    useToolbarStore.setState({
      ...useToolbarStore.getInitialState(),
      settingsOpen: true,
    });
  });

  it('renders the settings heading', async () => {
    await renderWithI18n(<SettingsPanel />, { language: 'en' });
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('shows unit toggle buttons', async () => {
    await renderWithI18n(<SettingsPanel />, { language: 'en' });
    expect(screen.getByText('Aviation')).toBeTruthy();
    expect(screen.getByText('Metric')).toBeTruthy();
    expect(screen.getByText('Imperial')).toBeTruthy();
  });

  it('shows history track limit presets and updates the setting', async () => {
    const user = userEvent.setup();
    await renderWithI18n(<SettingsPanel />, { language: 'en' });

    await user.click(screen.getByRole('button', { name: /Historical tracks/i }));

    expect(screen.getByRole('option', { name: '100' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '500' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '1000' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2000' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '5000' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'All (may affect performance)' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: '500' }));

    expect(useToolbarStore.getState().historyTrackLimit).toBe(500);
  });

  it('shows the translated all-tracks warning in Chinese', async () => {
    const user = userEvent.setup();
    await renderWithI18n(<SettingsPanel />, { language: 'zh-CN' });

    await user.click(screen.getByRole('button', { name: /历史航迹/ }));

    expect(screen.getByRole('option', { name: '全部（可能影响性能）' })).toBeInTheDocument();
  });

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup();
    await renderWithI18n(<SettingsPanel />, { language: 'en' });
    const closeBtn = screen.getByLabelText('Close settings');
    await user.click(closeBtn);
    expect(useToolbarStore.getState().settingsOpen).toBe(false);
  });

  it('resets all settings when reset button is clicked', async () => {
    const user = userEvent.setup();
    useToolbarStore.getState().setUnits('imperial');
    await renderWithI18n(<SettingsPanel />, { language: 'en' });
    const resetBtn = screen.getByText('Reset all settings');
    await user.click(resetBtn);
    expect(useToolbarStore.getState().units).toBe('nautical');
  });

  it('switches language from the settings panel', async () => {
    const user = userEvent.setup();
    await renderWithI18n(<SettingsPanel />, { language: 'en' });

    expect(screen.getByText('Settings')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Chinese' }));

    expect(i18n.language).toBe('zh-CN');
    expect(await screen.findByText('设置')).toBeInTheDocument();
  });

  it('exposes translated accessible names in Chinese mode', async () => {
    await renderWithI18n(<SettingsPanel />, { language: 'zh-CN' });

    expect(screen.getByRole('radio', { name: '英语' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '中文' })).toBeInTheDocument();
  });
});
