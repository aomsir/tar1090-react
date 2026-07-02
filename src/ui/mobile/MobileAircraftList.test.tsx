import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileAircraftList } from './MobileAircraftList';
import { setTestLanguage } from '@/i18n/testUtils';
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
  it('renders compact aircraft rows with flight, identity, altitude, and speed', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue([
      row({
        hex: 'abc123',
        flight: 'CCA123',
        registration: 'B-1234',
        typeCode: 'A359',
        altitude: 12000,
        speed: 430,
      }),
    ]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getByText('CCA123')).toBeInTheDocument();
    expect(screen.getByText('B-1234 · A359')).toBeInTheDocument();
    expect(screen.getByText('12,000 ft')).toBeInTheDocument();
    expect(screen.getByText('430 kt')).toBeInTheDocument();
  });

  it('renders flag, registration, and type code when available', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue([
      row({
        hex: 'abc123',
        flight: 'CCA123',
        registration: 'B-1234',
        typeCode: 'A359',
        country: 'China',
        flagPath: '/flags/cn.svg',
      }),
    ]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'China' })).toHaveAttribute('src', '/flags/cn.svg');
    expect(screen.getByText('B-1234 · A359')).toBeInTheDocument();
  });

  it('falls back to an altitude color dot when flag is unavailable', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue([
      row({ hex: 'abc123', flight: 'CCA123', altitude: 12000, flagPath: null }),
    ]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getByTestId('mobile-aircraft-altitude-dot')).toBeInTheDocument();
  });

  it('uses hex as secondary text when registration and type code are unavailable', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue([row({ hex: 'def456', flight: 'DAL456' })]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getByText('def456')).toBeInTheDocument();
  });

  it('shows only registration when type code is unavailable', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue([
      row({ hex: 'abc123', flight: 'CCA123', registration: 'B-1234', typeCode: '' }),
    ]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getByText('B-1234')).toBeInTheDocument();
  });

  it('shows only type code when registration is unavailable', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue([
      row({ hex: 'abc123', flight: 'CCA123', registration: '', typeCode: 'A359' }),
    ]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getByText('A359')).toBeInTheDocument();
  });

  it('renders a visible focus indicator on row options', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue([
      row({ hex: 'abc123', flight: 'CCA123' }),
    ]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    const option = screen.getByRole('option', { name: /CCA123/i });
    expect(option.className).toContain('focus-visible:ring-2');
    expect(option.className).toContain('focus-visible:ring-white/50');
  });

  it('renders nothing when there are no rows', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue([]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.queryByTestId('mobile-aircraft-list')).not.toBeInTheDocument();
  });

  it('falls back to hex when flight is empty', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue([row({ hex: 'def456', flight: '' })]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getByText('def456')).toBeInTheDocument();
  });

  it('limits the mobile list to eight rows', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue(
      Array.from({ length: 10 }, (_, index) => row({ hex: `hex${index}`, flight: `FLT${index}` })),
    );
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getAllByRole('option')).toHaveLength(8);
    expect(screen.queryByText('FLT8')).not.toBeInTheDocument();
  });

  it('selects the tapped aircraft', async () => {
    await setTestLanguage('en');
    const onSelect = vi.fn();
    vi.mocked(useAircraftRows).mockReturnValue([row({ hex: 'abc123', flight: 'CCA123' })]);
    render(<MobileAircraftList onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('option', { name: /CCA123/i }));
    expect(onSelect).toHaveBeenCalledWith('abc123');
  });

  it('exposes listbox semantics with an accessible label', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue([
      row({ hex: 'abc123', flight: 'CCA123' }),
    ]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getByRole('listbox', { name: 'Aircraft list' })).toBeInTheDocument();
  });

  it('renders rows with option semantics', async () => {
    await setTestLanguage('en');
    vi.mocked(useAircraftRows).mockReturnValue([
      row({ hex: 'abc123', flight: 'CCA123' }),
    ]);
    render(<MobileAircraftList onSelect={vi.fn()} />);
    expect(screen.getByRole('option', { name: /CCA123/i })).toBeInTheDocument();
  });
});
