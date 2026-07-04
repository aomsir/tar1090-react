import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartCard } from '@/ui/StatsDashboard/ChartCard';

describe('ChartCard', () => {
  it('keeps full-height sizing while allowing the body to be constrained', () => {
    const { container } = render(
      <ChartCard title="Aircraft Type" contentClassName="overflow-hidden">
        <div data-testid="card-child">Ranked rows</div>
      </ChartCard>,
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('h-full');
    expect(card.className).toContain('min-h-0');
    expect(card.className).not.toContain('max-h-');
    expect(card.className).not.toContain('h-44');

    const body = screen.getByTestId('card-child').parentElement as HTMLElement;
    expect(body.className).toContain('flex-1');
    expect(body.className).toContain('min-h-0');
    expect(body.className).toContain('overflow-hidden');
  });
});
