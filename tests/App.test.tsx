import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setTestLanguage } from '@/i18n/testUtils';

vi.mock('@/map/MapView', () => ({
  MapView: () => <div data-testid="map-root" />,
}));
vi.mock('@/features/live/useLiveData', () => ({ useLiveData: () => {} }));
vi.mock('@/app/useUrlSync', () => ({ useUrlSync: () => {} }));

import App from '@/App';

describe('App', () => {
  it('renders the app brand title', async () => {
    await setTestLanguage('en');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Live Traffic')).toBeInTheDocument());
  });
});
