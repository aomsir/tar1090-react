export function formatNumber(value: number | undefined, digits = 0): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatSpeedKt(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value).toString() : '';
}

export function formatVerticalRate(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value).toString() : '';
}

export function formatDistanceNm(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '';
}

export function formatRssi(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '';
}

export function formatAge(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value).toString() : '';
}

export function formatCoordinate(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(4) : '';
}

export function formatDetail(value: number | string | null | undefined, suffix = ''): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && !Number.isFinite(value)) return '—';
  return `${value}${suffix}`;
}
