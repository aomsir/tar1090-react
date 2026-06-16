import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/map/MapView', () => ({
  MapView: () => <div data-testid="map-root" />,
}));
vi.mock('@/features/live/useLiveData', () => ({ useLiveData: () => {} }));
vi.mock('@/app/useUrlSync', () => ({ useUrlSync: () => {} }));

import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders command bar, list panel, replay bar and map regions', () => {
    render(<AppShell />);
    expect(screen.getByTestId('command-bar')).toBeInTheDocument();
    expect(screen.getByTestId('list-panel')).toBeInTheDocument();
    expect(screen.getByTestId('replay-bar')).toBeInTheDocument();
    expect(screen.getByTestId('map-root')).toBeInTheDocument();
  });
});
