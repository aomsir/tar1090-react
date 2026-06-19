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

export function formatTimestamp(epochSec: number | undefined): string {
  if (typeof epochSec !== 'number' || !Number.isFinite(epochSec)) return '';
  const d = new Date(epochSec * 1000);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function formatDetail(value: number | string | null | undefined, suffix = ''): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && !Number.isFinite(value)) return '—';
  return `${value}${suffix}`;
}
