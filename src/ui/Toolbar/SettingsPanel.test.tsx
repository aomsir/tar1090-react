import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import { useToolbarStore } from '@/store/toolbarStore';

describe('SettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    useToolbarStore.setState({ ...useToolbarStore.getInitialState(), settingsOpen: true });
  });

  it('renders the settings heading', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('shows unit toggle buttons', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Aviation')).toBeTruthy();
    expect(screen.getByText('Metric')).toBeTruthy();
    expect(screen.getByText('Imperial')).toBeTruthy();
  });

  it('closes when close button is clicked', () => {
    render(<SettingsPanel />);
    const closeBtn = screen.getByLabelText('Close settings');
    fireEvent.click(closeBtn);
    expect(useToolbarStore.getState().settingsOpen).toBe(false);
  });

  it('resets all settings when reset button is clicked', () => {
    useToolbarStore.getState().setUnits('imperial');
    render(<SettingsPanel />);
    const resetBtn = screen.getByText('Reset all settings');
    fireEvent.click(resetBtn);
    expect(useToolbarStore.getState().units).toBe('nautical');
  });
});
