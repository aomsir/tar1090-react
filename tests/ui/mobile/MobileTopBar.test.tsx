import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileTopBar } from '@/ui/mobile/MobileTopBar';
import { useListControls } from '@/store/listControls';
import { useStatsStore } from '@/store/statsStore';
import { useSelectionStore } from '@/store/selectionStore';
import { setTestLanguage } from '@/i18n/testUtils';
import { usePlaybackStore } from '@/store/playbackStore';
import { useHistoryStatsStore } from '@/store/historyStatsStore';

vi.mock('@/ui/mobile/MobileAircraftList', () => ({
  MobileAircraftList: ({ onSelect }: { onSelect: (hex: string) => void }) => (
    <div data-testid="mobile-aircraft-list">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelect('abc123')}
      >
        CCA123
      </button>
    </div>
  ),
}));

describe('MobileTopBar', () => {
  beforeEach(() => {
    useListControls.setState({ query: '' });
    useStatsStore.setState({ count: 42 });
    useSelectionStore.setState({ selectedHex: null });
    usePlaybackStore.getState().reset();
    useHistoryStatsStore.getState().clear();
  });

  it('writes the search input into listControls.query', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    fireEvent.change(input, { target: { value: 'CCA' } });
    expect(useListControls.getState().query).toBe('CCA');
  });

  it('shows the aircraft count from statsStore', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    expect(screen.getByTestId('mobile-top-bar')).toHaveTextContent('42');
  });

  it('shows the history pass count in history mode', async () => {
    await setTestLanguage('en');
    useHistoryStatsStore.getState().setStats({ totalPasses: 7 } as never);
    usePlaybackStore.getState().setMode('history');
    render(<MobileTopBar />);
    expect(screen.getByTestId('mobile-top-bar')).toHaveTextContent('Aircraft 7');
  });

  it('renders translated placeholder in zh-CN', async () => {
    await setTestLanguage('zh-CN');
    render(<MobileTopBar />);
    expect(screen.getByPlaceholderText('呼号 / 注册号 / ICAO')).toBeInTheDocument();
  });

  it('opens the lightweight list when the search field receives focus', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    fireEvent.focus(screen.getByPlaceholderText('Flight / registration / ICAO'));
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
  });

  it('keeps the lightweight list visible while a query has text', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    fireEvent.change(input, { target: { value: 'CCA' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
  });

  it('selects an aircraft from the lightweight list and closes it', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    fireEvent.focus(screen.getByPlaceholderText('Flight / registration / ICAO'));
    fireEvent.click(screen.getByRole('button', { name: 'CCA123' }));
    expect(useSelectionStore.getState().selectedHex).toBe('abc123');
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
  });

  it('closes the lightweight list when Escape is pressed', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    const button = screen.getByRole('button', { name: 'Show aircraft list' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'CCA' } });
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
    expect(useListControls.getState().query).toBe('');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the lightweight list on Escape when opened by focus without a query', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    const button = screen.getByRole('button', { name: 'Show aircraft list' });
    fireEvent.focus(input);
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the lightweight list from the explicit aircraft list button', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const button = screen.getByRole('button', { name: 'Show aircraft list' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('uses a 44px touch target for the explicit aircraft list button', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const button = screen.getByRole('button', { name: 'Show aircraft list' });
    expect(button).toHaveClass('h-11');
    expect(button).toHaveClass('w-11');
  });

  it('squares the bar bottom corners only when the listbox is present as a sibling', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const bar = screen.getByTestId('mobile-top-bar').querySelector('div')!;
    expect(bar.className).toContain('[&:has(+[role=listbox])]:rounded-b-none');
  });

  it('closes the lightweight list from the explicit aircraft list button when search is inactive', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const button = screen.getByRole('button', { name: 'Show aircraft list' });
    fireEvent.click(button);
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('dismisses the focus-driven list when the explicit aircraft list button is clicked', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    const button = screen.getByRole('button', { name: 'Show aircraft list' });
    fireEvent.focus(input);
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(button);
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the query-driven list visible when the explicit aircraft list button is clicked', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    const button = screen.getByRole('button', { name: 'Show aircraft list' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'CCA' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
  });

  it('closes the pinned list on selection and resets the explicit toggle', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const button = screen.getByRole('button', { name: 'Show aircraft list' });
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: 'CCA123' }));
    expect(useSelectionStore.getState().selectedHex).toBe('abc123');
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the pinned list on Escape and resets the explicit toggle', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const button = screen.getByRole('button', { name: 'Show aircraft list' });
    fireEvent.click(button);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders translated list button label in zh-CN', async () => {
    await setTestLanguage('zh-CN');
    render(<MobileTopBar />);
    expect(screen.getByRole('button', { name: '显示飞机列表' })).toBeInTheDocument();
  });

  it('hides the pinned list when a pointerdown lands outside the header', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const button = screen.getByRole('button', { name: 'Show aircraft list' });
    fireEvent.click(button);
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
  });

  it('keeps the query text after dismissing the list via outside pointerdown', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    fireEvent.change(input, { target: { value: 'CCA' } });
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
    expect(input).toHaveValue('CCA');
  });

  it('shows the list again after focusing the search input following an outside dismissal', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    fireEvent.change(input, { target: { value: 'CCA' } });
    fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
    fireEvent.focus(input);
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
  });

  it('keeps the list visible when a pointerdown lands inside the header', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const button = screen.getByRole('button', { name: 'Show aircraft list' });
    fireEvent.click(button);
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByPlaceholderText('Flight / registration / ICAO'));
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
  });
});
