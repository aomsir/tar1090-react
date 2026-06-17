import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DetailCard } from './DetailCard';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { Aircraft } from '@/domain/Aircraft';

describe('DetailCard', () => {
  beforeEach(() => {
    aircraftStore.reset();
    useLiveTick.setState({ version: 0 });
    useSelectionStore.setState({ selectedHex: null });
  });

  it('renders nothing when no aircraft is selected', () => {
    const { container } = render(<DetailCard />);
    expect(container.firstChild).toBeNull();
  });

  it('shows selected aircraft fields and closes on button', () => {
    const a = new Aircraft('780ABC');
    Object.assign(a, {
      flight: 'CCA101',
      registration: 'B-2033',
      typeCode: 'A320',
      country: 'China',
      altitude: 35000,
    });
    aircraftStore.map.set('780ABC', a);
    useSelectionStore.setState({ selectedHex: '780ABC' });

    render(<DetailCard />);
    expect(screen.getByText('CCA101')).toBeInTheDocument();
    expect(screen.getByText('B-2033')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(useSelectionStore.getState().selectedHex).toBeNull();
  });
});
