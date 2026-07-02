import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileDetailSheet } from './MobileDetailSheet';
import { useSelectionStore } from '@/store/selectionStore';
import { setTestLanguage } from '@/i18n/testUtils';
import type { AircraftDetail } from '@/features/detail/aircraftDetail';

const detail: AircraftDetail = {
  hex: 'abc123',
  flight: 'CES2345',
  registration: 'B-1234',
  typeCode: 'A320',
  country: 'China',
  flagPath: null,
  isMilitary: false,
  isMlat: false,
  altitude: 36000,
  speed: 465,
  track: 274,
  groups: [
    {
      title: 'Identity',
      color: 'indigo',
      rows: [{ label: 'ICAO', value: 'ABC123' }],
    },
  ],
} as AircraftDetail;

const useSelectedAircraftMock = vi.fn<() => AircraftDetail | null>(() => detail);

vi.mock('@/features/detail/useSelectedAircraft', () => ({
  useSelectedAircraft: () => useSelectedAircraftMock(),
}));
vi.mock('@/features/detail/useAircraftPhoto', () => ({
  useAircraftPhoto: () => ({ photo: null, loading: false }),
}));

function dragHandle(fromY: number, toY: number) {
  const handle = screen.getByTestId('sheet-drag-handle');
  fireEvent.touchStart(handle, { touches: [{ clientY: fromY }] });
  fireEvent.touchEnd(handle, { changedTouches: [{ clientY: toY }] });
}

describe('MobileDetailSheet', () => {
  beforeEach(async () => {
    await setTestLanguage('en');
    useSelectedAircraftMock.mockReturnValue(detail);
    useSelectionStore.setState({ selectedHex: 'abc123', selectedHexes: new Set() });
  });

  it('renders nothing when no aircraft selected', () => {
    useSelectedAircraftMock.mockReturnValue(null);
    render(<MobileDetailSheet />);
    expect(screen.queryByTestId('mobile-detail-sheet')).not.toBeInTheDocument();
  });

  it('renders header and key stats in expanded state by default', () => {
    render(<MobileDetailSheet />);
    const sheet = screen.getByTestId('mobile-detail-sheet');
    expect(sheet).toHaveAttribute('data-state', 'expanded');
    expect(sheet).toHaveTextContent('CES2345');
    expect(sheet).toHaveTextContent('B-1234');
    expect(sheet).toHaveTextContent('465');
    expect(sheet).toHaveTextContent('274°');
  });

  it('expands when dragged up past threshold', () => {
    render(<MobileDetailSheet />);
    dragHandle(500, 380); // -120px
    expect(screen.getByTestId('mobile-detail-sheet')).toHaveAttribute('data-state', 'expanded');
  });

  it('stays expanded when drag is below threshold', () => {
    render(<MobileDetailSheet />);
    dragHandle(500, 460); // -40px < 60px threshold
    expect(screen.getByTestId('mobile-detail-sheet')).toHaveAttribute('data-state', 'expanded');
  });

  it('collapses from expanded to peek when dragged down', () => {
    render(<MobileDetailSheet />);
    dragHandle(300, 420);
    expect(screen.getByTestId('mobile-detail-sheet')).toHaveAttribute('data-state', 'peek');
  });

  it('closes (clears selection) when dragged down from peek', () => {
    render(<MobileDetailSheet />);
    dragHandle(300, 420); // expanded -> peek
    dragHandle(300, 420); // peek -> close
    expect(useSelectionStore.getState().selectedHex).toBeNull();
  });

  it('closes when close button pressed', () => {
    render(<MobileDetailSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(useSelectionStore.getState().selectedHex).toBeNull();
  });

  it('resets to expanded when a different aircraft is selected', () => {
    const { rerender } = render(<MobileDetailSheet />);
    dragHandle(300, 420); // -> peek
    useSelectedAircraftMock.mockReturnValue({ ...detail, hex: 'def456' } as AircraftDetail);
    rerender(<MobileDetailSheet />);
    expect(screen.getByTestId('mobile-detail-sheet')).toHaveAttribute('data-state', 'expanded');
  });

  it('shows group rows and KML export button', () => {
    render(<MobileDetailSheet />);
    expect(screen.getByText('Identity')).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export KML' })).toBeInTheDocument();
  });
});
