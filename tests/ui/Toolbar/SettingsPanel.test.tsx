import { createContext, useContext, type ComponentProps, type ReactNode } from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '@/ui/Toolbar/SettingsPanel';
import { useToolbarStore } from '@/store/toolbarStore';
import { renderWithI18n } from '@/i18n/testUtils';
import i18n from '@/i18n';

type SliderProps = {
  value?: number | number[];
  onChange?: (value: unknown) => void;
  onChangeEnd?: (value: unknown) => void;
  children: ReactNode;
};

const SliderContext = createContext<SliderProps | null>(null);
const invalidSliderValues: unknown[] = [[], [500], [undefined, 28_500], ['500', 28_500]];

vi.mock('@heroui/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@heroui/react')>();

  function Slider({ children, ...props }: SliderProps) {
    const isRange = Array.isArray(props.value);
    return (
      <SliderContext.Provider value={{ ...props, children }}>
        <div data-testid={isRange ? 'altitude-slider' : undefined}>
          {children}
          {isRange && (
            <>
              <button onClick={() => props.onChange?.([500, 28_500])}>preview altitude</button>
              <button onClick={() => props.onChangeEnd?.([500, 28_500])}>commit altitude</button>
              {invalidSliderValues.map((value, index) => (
                <button key={index} onClick={() => props.onChange?.(value)}>
                  invalid preview {index}
                </button>
              ))}
              {invalidSliderValues.map((value, index) => (
                <button key={index} onClick={() => props.onChangeEnd?.(value)}>
                  invalid commit {index}
                </button>
              ))}
            </>
          )}
        </div>
      </SliderContext.Provider>
    );
  }

  function SliderTrack({
    children,
    className,
  }: {
    children: ReactNode | ((props: { state: { values: number[] } }) => ReactNode);
    className?: string;
  }) {
    const slider = useContext(SliderContext);
    const values = Array.isArray(slider?.value) ? slider.value : [slider?.value ?? 0];
    return (
      <div data-testid="slider-track" className={className}>
        {typeof children === 'function' ? children({ state: { values } }) : children}
      </div>
    );
  }
  Slider.Track = SliderTrack;
  Slider.Fill = () => <div data-testid="slider-fill" />;
  Slider.Thumb = ({ index, ...props }: ComponentProps<'button'> & { index?: number }) => (
    <button data-thumb-index={index} {...props} />
  );
  Slider.Output = () => <output />;

  return { ...actual, Slider };
});

describe('SettingsPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('shows altitude filter switch', async () => {
    await renderWithI18n(<SettingsPanel />, { language: 'en' });
    expect(screen.getByText('Altitude filter')).toBeInTheDocument();
  });

  it('shows altitude range slider when filter is enabled', async () => {
    useToolbarStore.setState({ altitudeFilterEnabled: true });
    await renderWithI18n(<SettingsPanel />, { language: 'en' });
    expect(screen.getByText('0 – 45,000 ft')).toBeInTheDocument();
  });

  it('previews altitude range changes and commits only on release', async () => {
    const user = userEvent.setup();
    useToolbarStore.setState({ altitudeFilterEnabled: true });
    const setAltitudeFilterRange = vi.spyOn(useToolbarStore.getState(), 'setAltitudeFilterRange');
    await renderWithI18n(<SettingsPanel />, { language: 'en' });

    expect(
      screen.getAllByRole('button', { name: /minimum altitude|maximum altitude/i }),
    ).toHaveLength(2);
    expect(screen.getAllByTestId('slider-track').at(-1)).toHaveClass('mx-2');
    expect(screen.getAllByRole('button', { name: /minimum altitude|maximum altitude/i })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataset: expect.objectContaining({ thumbIndex: '0' }) }),
        expect.objectContaining({ dataset: expect.objectContaining({ thumbIndex: '1' }) }),
      ]),
    );

    await user.click(screen.getByRole('button', { name: 'preview altitude' }));
    expect(screen.getByText('500 – 28,500 ft')).toBeInTheDocument();
    expect(useToolbarStore.getState()).toMatchObject({
      altitudeFilterMin: 0,
      altitudeFilterMax: 45_000,
    });
    expect(setAltitudeFilterRange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'commit altitude' }));
    expect(setAltitudeFilterRange).toHaveBeenCalledTimes(1);
    expect(useToolbarStore.getState()).toMatchObject({
      altitudeFilterMin: 500,
      altitudeFilterMax: 28_500,
    });
  });

  it.each([0, 1, 2, 3])('ignores invalid slider payload %#', async (index) => {
    const user = userEvent.setup();
    useToolbarStore.setState({ altitudeFilterEnabled: true });
    const setAltitudeFilterRange = vi.spyOn(useToolbarStore.getState(), 'setAltitudeFilterRange');
    await renderWithI18n(<SettingsPanel />, { language: 'en' });

    await user.click(screen.getByRole('button', { name: `invalid preview ${index}` }));
    expect(screen.getByText('0 – 45,000 ft')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `invalid commit ${index}` }));
    expect(setAltitudeFilterRange).not.toHaveBeenCalled();
    expect(useToolbarStore.getState()).toMatchObject({
      altitudeFilterMin: 0,
      altitudeFilterMax: 45_000,
    });
  });

  it('syncs the preview when the committed range changes outside the slider', async () => {
    useToolbarStore.setState({ altitudeFilterEnabled: true });
    await renderWithI18n(<SettingsPanel />, { language: 'en' });

    useToolbarStore.setState({ altitudeFilterMin: 1_000, altitudeFilterMax: 30_000 });

    expect(await screen.findByText('1,000 – 30,000 ft')).toBeInTheDocument();
  });

  it('keeps the local preview through an external update until release, then resumes syncing', async () => {
    const user = userEvent.setup();
    useToolbarStore.setState({ altitudeFilterEnabled: true });
    await renderWithI18n(<SettingsPanel />, { language: 'en' });

    await user.click(screen.getByRole('button', { name: 'preview altitude' }));
    await act(async () => {
      useToolbarStore.getState().setAltitudeFilterRange(1_000, 30_000);
    });
    expect(screen.getByText('500 – 28,500 ft')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'commit altitude' }));
    expect(useToolbarStore.getState()).toMatchObject({
      altitudeFilterMin: 500,
      altitudeFilterMax: 28_500,
    });

    useToolbarStore.getState().setAltitudeFilterRange(1_500, 35_000);
    expect(await screen.findByText('1,500 – 35,000 ft')).toBeInTheDocument();
  });

  it('ends the adjustment session when release payload is invalid', async () => {
    const user = userEvent.setup();
    useToolbarStore.setState({ altitudeFilterEnabled: true });
    const setAltitudeFilterRange = vi.spyOn(useToolbarStore.getState(), 'setAltitudeFilterRange');
    await renderWithI18n(<SettingsPanel />, { language: 'en' });

    await user.click(screen.getByRole('button', { name: 'preview altitude' }));
    await user.click(screen.getByRole('button', { name: 'invalid commit 0' }));
    expect(setAltitudeFilterRange).not.toHaveBeenCalled();
    expect(useToolbarStore.getState()).toMatchObject({
      altitudeFilterMin: 0,
      altitudeFilterMax: 45_000,
    });

    await act(async () => {
      useToolbarStore.getState().setAltitudeFilterRange(1_000, 30_000);
    });
    expect(screen.getByText('1,000 – 30,000 ft')).toBeInTheDocument();
  });

  it('preserves the committed altitude range when the filter is disabled and re-enabled', async () => {
    const user = userEvent.setup();
    useToolbarStore.setState({
      altitudeFilterEnabled: true,
      altitudeFilterMin: 500,
      altitudeFilterMax: 28_500,
    });
    await renderWithI18n(<SettingsPanel />, { language: 'en' });

    const switchEl = screen.getByRole('switch', { name: 'Altitude filter' });
    await user.click(switchEl);
    await user.click(switchEl);

    expect(useToolbarStore.getState()).toMatchObject({
      altitudeFilterEnabled: true,
      altitudeFilterMin: 500,
      altitudeFilterMax: 28_500,
    });
    expect(screen.getByText('500 – 28,500 ft')).toBeInTheDocument();
  });

  it('shows translated range endpoints and the update-on-release hint', async () => {
    useToolbarStore.setState({ altitudeFilterEnabled: true });
    await renderWithI18n(<SettingsPanel />, { language: 'en' });

    expect(screen.getByText('0 ft')).toBeInTheDocument();
    expect(screen.getByText('45,000 ft')).toBeInTheDocument();
    expect(screen.getByText('Release the slider to update the map')).toBeInTheDocument();
  });

  it('does not show altitude range slider when filter is disabled', async () => {
    useToolbarStore.setState({ altitudeFilterEnabled: false });
    await renderWithI18n(<SettingsPanel />, { language: 'en' });
    expect(screen.queryByTestId('altitude-slider')).not.toBeInTheDocument();
  });

  it('toggles altitude filter enabled state', async () => {
    const user = userEvent.setup();
    await renderWithI18n(<SettingsPanel />, { language: 'en' });

    await user.click(screen.getByRole('switch', { name: /altitude filter/i }));

    expect(useToolbarStore.getState().altitudeFilterEnabled).toBe(true);
  });
});
