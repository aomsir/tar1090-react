import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AltitudeLegend } from './AltitudeLegend';

describe('AltitudeLegend', () => {
  it('renders altitude tick labels', () => {
    render(<AltitudeLegend />);
    expect(screen.getByTestId('altitude-legend')).toBeInTheDocument();
    expect(screen.getByText('Ground')).toBeInTheDocument();
    expect(screen.getByText('40k')).toBeInTheDocument();
  });
});
