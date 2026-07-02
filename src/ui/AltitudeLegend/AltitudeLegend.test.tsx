import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AltitudeLegend } from './AltitudeLegend';
import { setTestLanguage } from '@/i18n/testUtils';

describe('AltitudeLegend', () => {
  it('renders altitude tick labels in English by default', async () => {
    await setTestLanguage('en');
    render(<AltitudeLegend />);
    expect(screen.getByTestId('altitude-legend')).toBeInTheDocument();
    expect(screen.getByText('Ground')).toBeInTheDocument();
    expect(screen.getByText('40k')).toBeInTheDocument();
  });

  it('translates the Ground tick label in zh-CN', async () => {
    await setTestLanguage('zh-CN');
    render(<AltitudeLegend />);
    expect(screen.getByText('地面')).toBeInTheDocument();
  });

  it('sits below the replay bar to avoid overlap', async () => {
    await setTestLanguage('en');
    render(<AltitudeLegend />);
    const legend = screen.getByTestId('altitude-legend');
    expect(legend).toHaveClass('bottom-[3.875rem]');
    expect(legend).not.toHaveClass('bottom-16');
    expect(legend).not.toHaveClass('bottom-14');
    expect(legend).not.toHaveClass('bottom-8');
  });
});
