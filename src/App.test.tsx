import { render, screen } from '@testing-library/react'
import App from '@/App'

it('renders the app brand title', () => {
  render(<App />)
  expect(screen.getByText('Live Traffic')).toBeInTheDocument()
})
