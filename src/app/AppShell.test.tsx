import { render, screen } from '@testing-library/react';
import { AppShell } from '@/app/AppShell';

it('renders command bar, list panel, replay bar and the map root', () => {
  render(<AppShell />);
  expect(screen.getByTestId('command-bar')).toBeInTheDocument();
  expect(screen.getByTestId('list-panel')).toBeInTheDocument();
  expect(screen.getByTestId('replay-bar')).toBeInTheDocument();
  expect(screen.getByTestId('map-root')).toBeInTheDocument();
});
