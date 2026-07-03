import { describe, expect, it } from 'vitest';
import {
  asSupportedLanguage,
  formatInteger,
  formatLocaleForLanguage,
  formatShortTime,
  formatTimeOfDay,
} from './format';

describe('i18n format helpers', () => {
  describe('formatLocaleForLanguage', () => {
    it('maps supported languages to formatting locales', () => {
      expect(formatLocaleForLanguage('en')).toBe('en-US');
      expect(formatLocaleForLanguage('zh-CN')).toBe('zh-CN');
    });

    it('falls back to en-US for undefined language', () => {
      expect(formatLocaleForLanguage(undefined)).toBe('en-US');
    });

    it('falls back to en-US for unsupported languages', () => {
      expect(formatLocaleForLanguage('fr-FR')).toBe('en-US');
    });
  });

  describe('asSupportedLanguage', () => {
    it('maps en to en', () => {
      expect(asSupportedLanguage('en')).toBe('en');
    });

    it('maps zh-CN to zh-CN', () => {
      expect(asSupportedLanguage('zh-CN')).toBe('zh-CN');
    });

    it('falls back to en for undefined language', () => {
      expect(asSupportedLanguage(undefined)).toBe('en');
    });

    it('falls back to en for unsupported languages', () => {
      expect(asSupportedLanguage('fr-FR')).toBe('en');
    });
  });

  describe('formatInteger', () => {
    it('formats integers using the active language locale', () => {
      expect(formatInteger(1234567, 'en')).toBe('1,234,567');
      expect(formatInteger(1234567, 'zh-CN')).toBe('1,234,567');
    });

    it('formats using the fallback locale when language is missing', () => {
      expect(formatInteger(1234567, undefined)).toBe('1,234,567');
    });
  });

  describe('formatTimeOfDay', () => {
    // 3600s is a whole hour; minutes and seconds are 00 in every timezone,
    // so this validates 24-hour 2-digit output without pinning the host TZ.
    it('formats time of day with a 24-hour clock', () => {
      expect(formatTimeOfDay(3600, 'en')).toMatch(/^\d{2}:00:00$/);
      expect(formatTimeOfDay(3600, 'zh-CN')).toMatch(/^\d{2}:00:00$/);
    });

    it('returns a placeholder for falsy timestamps', () => {
      expect(formatTimeOfDay(0, 'en')).toBe('--:--:--');
      expect(formatTimeOfDay(0, 'zh-CN')).toBe('--:--:--');
    });
  });

  describe('formatShortTime', () => {
    it('formats hour and minute with a 24-hour clock', () => {
      expect(formatShortTime(3600, 'en')).toMatch(/^\d{2}:00$/);
      expect(formatShortTime(3600, 'zh-CN')).toMatch(/^\d{2}:00$/);
    });

    it('returns an empty string for falsy timestamps', () => {
      expect(formatShortTime(0, 'en')).toBe('');
      expect(formatShortTime(0, 'zh-CN')).toBe('');
    });
  });
});
