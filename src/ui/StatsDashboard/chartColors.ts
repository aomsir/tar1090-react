/**
 * Amber monochrome theme for the stats dashboard.
 * - Amber leads; categorical series use SERIES_COLORS via seriesColor()
 * - AXIS/GRID/LABEL tokens shared by all recharts-based charts
 */

// Primary accent
export const AMBER = '#fbbf24';
export const AMBER_FILL_TOP = 'rgba(251, 191, 36, 0.3)';
export const AMBER_FILL_BOTTOM = 'rgba(251, 191, 36, 0.02)';
export const AMBER_CURSOR = 'rgba(251, 191, 36, 0.08)';

// Categorical palette: amber always leads, cool accents follow (index cycles)
export const SERIES_COLORS = [
  '#fbbf24', // amber
  '#38bdf8', // sky
  '#34d399', // emerald
  '#a78bfa', // violet
  '#fb923c', // orange
  '#f472b6', // pink
];

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

// Semantic accents (icons only)
export const SEMANTIC_RED = '#f87171';
export const SEMANTIC_GREEN = '#34d399';
export const SEMANTIC_SKY = '#38bdf8';

// Axis and label styling
export const AXIS_COLOR = '#8b96a5';
export const GRID_COLOR = 'rgba(255, 255, 255, 0.06)';
export const LABEL_COLOR = '#cbd5e1';
export const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';
