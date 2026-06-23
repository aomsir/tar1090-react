/**
 * D3 Category10 color palette for data visualization
 * - Industry standard, colorblind-friendly
 * - Use CHART_COLORS for multi-category charts (cycle through array)
 * - Use PRIMARY_COLOR/PRIMARY_FILL for single-variable charts
 */

// Multi-category data (bar charts, pie charts)
export const CHART_COLORS = [
  '#1f77b4', // blue
  '#ff7f0e', // orange
  '#2ca02c', // green
  '#d62728', // red
  '#9467bd', // purple
  '#8c564b', // brown
  '#e377c2', // pink
  '#7f7f7f', // gray
  '#bcbd22', // olive
  '#17becf', // cyan
];

// Single-variable data (timelines, histograms)
export const PRIMARY_COLOR = '#1f77b4';
export const PRIMARY_FILL = 'rgba(31, 119, 180, 0.2)';

// Axis and label styling
export const AXIS_COLOR = '#94a3b8';
export const LABEL_COLOR = '#cbd5e1';
