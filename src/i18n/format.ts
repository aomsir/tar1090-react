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
