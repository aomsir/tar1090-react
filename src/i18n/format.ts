import type { SupportedLanguage } from './types';

export type FormatLocale = 'en-US' | 'zh-CN';

export function formatLocaleForLanguage(language: string | undefined): FormatLocale {
  return language?.startsWith('zh') ? 'zh-CN' : 'en-US';
}

export function asSupportedLanguage(language: string | undefined): SupportedLanguage {
  return language?.startsWith('zh') ? 'zh-CN' : 'en';
}

export function formatInteger(value: number, language: string | undefined): string {
  return value.toLocaleString(formatLocaleForLanguage(language));
}

export function formatTimeOfDay(tsSec: number, language: string | undefined): string {
  if (!tsSec) return '--:--:--';
  return new Date(tsSec * 1000).toLocaleTimeString(formatLocaleForLanguage(language), {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatShortTime(tsSec: number, language: string | undefined): string {
  if (!tsSec) return '';
  return new Date(tsSec * 1000).toLocaleTimeString(formatLocaleForLanguage(language), {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPassTimeRange(
  startTime: number,
  endTime: number,
  language: string | undefined,
): string {
  const formatter = new Intl.DateTimeFormat(formatLocaleForLanguage(language), {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const start = new Date(startTime * 1000);
  const end = new Date(endTime * 1000);
  const parts = (date: Date) =>
    Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter((part) => ['month', 'day', 'hour', 'minute'].includes(part.type))
        .map((part) => [part.type, part.value]),
    );
  const startParts = parts(start);
  const endParts = parts(end);
  const startLabel = `${startParts.month}-${startParts.day} ${startParts.hour}:${startParts.minute}`;
  if (startTime === endTime) return startLabel;
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  const endLabel = sameDay
    ? `${endParts.hour}:${endParts.minute}`
    : `${endParts.month}-${endParts.day} ${endParts.hour}:${endParts.minute}`;
  return `${startLabel}–${endLabel}`;
}
