import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileAircraftList } from './MobileAircraftList';
import type { AircraftRow } from '@/features/list/aircraftRows';

vi.mock('@/features/list/useAircraftRows', () => ({
  useAircraftRows: vi.fn(),
}));

const { useAircraftRows } = await import('@/features/list/useAircraftRows');

function row(overrides: Partial<AircraftRow>): AircraftRow {
  return {
    hex: 'abc123',
    flight: '',
    route: '',
    registration: '',
    typeCode: '',
    squawk: '',
    altitude: undefined,
    speed: undefined,
    vertRate: undefined,
    distance: undefined,
    track: undefined,
    messages: 0,
    seen: 0,
    rssi: undefined,
    lat: undefined,
    lon: undefined,
    dataSource: '',
    country: '',
    flagPath: null,
    isMilitary: false,
    isMlat: false,
    windDirection: undefined,
    windSpeed: undefined,
    lastSeenTime: undefined,
    ...overrides,
  };
}

describe('MobileAircraftList', () => {
  it('renders compact aircraft rows with flight, hex, altitude, and speed', () => {
    vi.mocked(useAircraftRows).mockReturnValue([
      row({ hex: 'abc123', flight: 'CCA123', altitude: 12000, speed: 430 }),
    ]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getByText('CCA123')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('12000 ft')).toBeInTheDocument();
    expect(screen.getByText('430 kt')).toBeInTheDocument();
  });

  it('falls back to hex when flight is empty', () => {
    vi.mocked(useAircraftRows).mockReturnValue([row({ hex: 'def456', flight: '' })]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getByText('def456')).toBeInTheDocument();
  });

  it('limits the mobile list to eight rows', () => {
    vi.mocked(useAircraftRows).mockReturnValue(
      Array.from({ length: 10 }, (_, index) => row({ hex: `hex${index}`, flight: `FLT${index}` })),
    );
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(8);
    expect(screen.queryByText('FLT8')).not.toBeInTheDocument();
  });

  it('selects the tapped aircraft', () => {
    const onSelect = vi.fn();
    vi.mocked(useAircraftRows).mockReturnValue([row({ hex: 'abc123', flight: 'CCA123' })]);
    render(<MobileAircraftList onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /CCA123/i }));
    expect(onSelect).toHaveBeenCalledWith('abc123');
  });
});
