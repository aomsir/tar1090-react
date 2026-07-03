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

const selectedAircraftMock = vi.fn<() => AircraftDetail | null>(() => detail);

vi.mock('@/features/detail/useSelectedAircraft', () => ({
  useSelectedAircraft: () => {
    const selectedHex = useSelectionStore((s) => s.selectedHex);
    return selectedHex ? selectedAircraftMock() : null;
  },
}));
vi.mock('@/features/detail/useAircraftPhoto', () => ({
  useAircraftPhoto: () => ({ photo: null, loading: false }),
}));

describe('MobileDetailSheet', () => {
  beforeEach(async () => {
    await setTestLanguage('en');
    selectedAircraftMock.mockReturnValue(detail);
    useSelectionStore.setState({ selectedHex: 'abc123', selectedHexes: new Set() });
  });

  it('renders nothing when no aircraft selected', () => {
    selectedAircraftMock.mockReturnValue(null);
    render(<MobileDetailSheet />);
    expect(screen.queryByTestId('mobile-detail-sheet')).not.toBeInTheDocument();
  });

  it('opens at the peek snap point by default', () => {
    render(<MobileDetailSheet />);
    const sheet = screen.getByTestId('mobile-detail-sheet');
    expect(sheet).toHaveAttribute('data-snap', 'peek');
  });

  it('renders header and key stats', () => {
    render(<MobileDetailSheet />);
    const sheet = screen.getByTestId('mobile-detail-sheet');
    expect(sheet).toHaveTextContent('CES2345');
    expect(sheet).toHaveTextContent('B-1234');
    expect(sheet).toHaveTextContent('465');
    expect(sheet).toHaveTextContent('274°');
  });

  it('closes when close button pressed', () => {
    render(<MobileDetailSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(useSelectionStore.getState().selectedHex).toBeNull();
  });

  it('unmounts the sheet after selection is cleared', () => {
    render(<MobileDetailSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(screen.queryByTestId('mobile-detail-sheet')).not.toBeInTheDocument();
  });

  it('shows group rows and KML export button', () => {
    render(<MobileDetailSheet />);
    expect(screen.getByText('Identity')).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export KML' })).toBeInTheDocument();
  });

  it('keeps a visual drag handle', () => {
    render(<MobileDetailSheet />);
    expect(screen.getByTestId('sheet-drag-handle')).toBeInTheDocument();
  });
});
