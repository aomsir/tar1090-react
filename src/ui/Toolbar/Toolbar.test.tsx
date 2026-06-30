import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithI18n } from '@/i18n/testUtils';
import { Toolbar } from './Toolbar';
import { useToolbarStore } from '@/store/toolbarStore';

describe('Toolbar', () => {
  beforeEach(() => {
    localStorage.clear();
    useToolbarStore.setState(useToolbarStore.getInitialState());
  });

  it('renders all 15 toolbar buttons (14 feature + 1 settings)', async () => {
    await renderWithI18n(<Toolbar onResetView={() => {}} onRandomPlane={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(15);
  });

  it('toggles enableLabels when label button is clicked', async () => {
    await renderWithI18n(<Toolbar onResetView={() => {}} onRandomPlane={() => {}} />);
    const labelBtn = screen.getByLabelText('Aircraft labels');
    fireEvent.click(labelBtn);
    expect(useToolbarStore.getState().enableLabels).toBe(true);
  });

  it('calls onResetView when home button is clicked', async () => {
    const onResetView = vi.fn();
    await renderWithI18n(<Toolbar onResetView={onResetView} onRandomPlane={() => {}} />);
    const homeBtn = screen.getByLabelText('Reset map view');
    fireEvent.click(homeBtn);
    expect(onResetView).toHaveBeenCalledOnce();
  });

  it('calls onRandomPlane when random button is clicked', async () => {
    const onRandomPlane = vi.fn();
    await renderWithI18n(<Toolbar onResetView={() => {}} onRandomPlane={onRandomPlane} />);
    const randomBtn = screen.getByLabelText('Random aircraft');
    fireEvent.click(randomBtn);
    expect(onRandomPlane).toHaveBeenCalledOnce();
  });

  it('renders inside a relative shell so the settings panel can anchor in docked layout', async () => {
    await renderWithI18n(<Toolbar onResetView={() => {}} onRandomPlane={() => {}} />);
    expect(screen.getByTestId('toolbar-shell').className).toContain('relative');
  });

  it('opens settings panel when settings button is clicked', async () => {
    await renderWithI18n(<Toolbar onResetView={() => {}} onRandomPlane={() => {}} />);
    const settingsBtn = screen.getByLabelText('Open settings panel');
    fireEvent.click(settingsBtn);
    expect(useToolbarStore.getState().settingsOpen).toBe(true);
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });
});
