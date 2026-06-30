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
});
