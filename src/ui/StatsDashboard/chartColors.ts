/**
 * Amber monochrome theme for the stats dashboard.
 * - Single hue; sequences use an opacity ladder via seriesOpacity()
 * - AXIS/GRID/LABEL tokens shared by all recharts-based charts
 */

// Primary accent
export const AMBER = '#fbbf24';
export const AMBER_FILL_TOP = 'rgba(251, 191, 36, 0.3)';
export const AMBER_FILL_BOTTOM = 'rgba(251, 191, 36, 0.02)';
export const AMBER_CURSOR = 'rgba(251, 191, 36, 0.08)';

// Opacity ladder for ranked series (item i, 0-based)
export function seriesOpacity(index: number): number {
  return Math.max(0.25, 1 - index * 0.08);
}

// Axis and label styling
export const AXIS_COLOR = '#8b96a5';
export const GRID_COLOR = 'rgba(255, 255, 255, 0.06)';
export const LABEL_COLOR = '#cbd5e1';
export const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// ---- Legacy exports (removed in cleanup task) ----
export const CHART_COLORS = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
];
export const PRIMARY_COLOR = '#1f77b4';
export const PRIMARY_FILL = 'rgba(31, 119, 180, 0.2)';
