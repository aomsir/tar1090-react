import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileTopBar } from './MobileTopBar';
import { useListControls } from '@/store/listControls';
import { useStatsStore } from '@/store/statsStore';
import { useSelectionStore } from '@/store/selectionStore';
import { setTestLanguage } from '@/i18n/testUtils';

vi.mock('./MobileAircraftList', () => ({
  MobileAircraftList: ({ onSelect }: { onSelect: (hex: string) => void }) => (
    <div data-testid="mobile-aircraft-list">
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onSelect('abc123')}>
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
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'CCA' } });
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
    expect(useListControls.getState().query).toBe('');
  });

  it('closes the lightweight list on Escape when opened by focus without a query', async () => {
    await setTestLanguage('en');
    render(<MobileTopBar />);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    fireEvent.focus(input);
    expect(screen.getByTestId('mobile-aircraft-list')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
  });
});
