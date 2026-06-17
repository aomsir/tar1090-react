import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandBar } from './CommandBar';
import { useListControls } from '@/store/listControls';

describe('CommandBar', () => {
  beforeEach(() => useListControls.setState({ query: '' }));

  it('writes the search input into listControls.query', () => {
    render(<CommandBar />);
    const input = screen.getByPlaceholderText('Flight / registration / ICAO');
    fireEvent.change(input, { target: { value: 'CCA' } });
    expect(useListControls.getState().query).toBe('CCA');
  });
});
