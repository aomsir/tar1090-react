import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileTopBar } from './MobileTopBar';
import { useListControls } from '@/store/listControls';
import { useStatsStore } from '@/store/statsStore';
import { setTestLanguage } from '@/i18n/testUtils';

describe('MobileTopBar', () => {
  beforeEach(() => {
    useListControls.setState({ query: '' });
    useStatsStore.setState({ count: 42 });
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
});
