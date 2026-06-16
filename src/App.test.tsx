import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/map/MapView', () => ({
  MapView: () => <div data-testid="map-root" />,
}));
vi.mock('@/features/live/useLiveData', () => ({ useLiveData: () => {} }));
vi.mock('@/app/useUrlSync', () => ({ useUrlSync: () => {} }));

import App from './App';

describe('App', () => {
  it('renders the app brand title', () => {
    render(<App />);
    expect(screen.getByText('Live Traffic')).toBeInTheDocument();
  });
});
