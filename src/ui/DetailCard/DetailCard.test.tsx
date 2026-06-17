import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DetailCard } from './DetailCard';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { Aircraft } from '@/domain/Aircraft';
import { historyStore } from '@/store/historyStore';
import type { AircraftSnapshot } from '@/data/types';

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

  it('exports a KML download for the selected aircraft track', () => {
    aircraftStore.reset();
    aircraftStore.applySnapshot({
      now: 200,
      messages: 0,
      aircraft: [
        { hex: 'abc', flight: 'TEST', lat: 1, lon: 2, altitude: 1000 },
      ] as unknown as AircraftSnapshot['aircraft'],
    });
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: 'abc', lat: 0, lon: 0, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
      {
        now: 130,
        messages: 0,
        aircraft: [
          { hex: 'abc', lat: 0, lon: 1, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    useLiveTick.getState().bump();
    useSelectionStore.setState({ selectedHex: 'abc' });

    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<DetailCard />);
    fireEvent.click(screen.getByRole('button', { name: /Export KML/ }));

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
