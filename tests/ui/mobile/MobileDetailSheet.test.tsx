import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MobileDetailSheet } from '@/ui/mobile/MobileDetailSheet';
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

  it('uses a full-height drawer content without an 85dvh max-height cap', () => {
    render(<MobileDetailSheet />);
    const sheet = screen.getByTestId('mobile-detail-sheet');
    expect(sheet.className).toContain('h-full');
    expect(sheet.className).not.toContain('max-h-[85dvh]');
  });

  it('wraps the sheet body in an 85% height container', () => {
    render(<MobileDetailSheet />);
    const sheet = screen.getByTestId('mobile-detail-sheet');
    const wrapper = Array.from(sheet.children).find((el) =>
      el.className.includes('h-[85%]'),
    );
    expect(wrapper).toBeTruthy();
  });

  it('keeps the drag handle outside the scroll area but keeps header, key stats, and KML button inside', () => {
    render(<MobileDetailSheet />);
    const scrollArea = screen.getByTestId('sheet-scroll-area');
    const handle = screen.getByTestId('sheet-drag-handle');
    expect(scrollArea.contains(handle)).toBe(false);
    expect(within(scrollArea).getByRole('button', { name: 'Close details' })).toBeInTheDocument();
    expect(within(scrollArea).getByTestId('key-stats')).toBeInTheDocument();
    expect(within(scrollArea).getByRole('button', { name: 'Export KML' })).toBeInTheDocument();
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
