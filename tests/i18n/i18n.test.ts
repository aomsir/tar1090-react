import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('i18n initialization', () => {
  const originalLanguage = window.navigator.language;
  const originalLanguages = window.navigator.languages;

  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'language', {
      value: originalLanguage,
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'languages', {
      value: originalLanguages,
      configurable: true,
    });
  });

  it('falls back to English for unsupported languages', async () => {
    setBrowserLanguage('fr-FR');
    const { default: i18n } = await import('./index');
    await i18n.changeLanguage('fr-FR');

    expect(i18n.t('settings.title')).toBe('Settings');
  });

  it('uses Simplified Chinese for zh-CN', async () => {
    setBrowserLanguage('zh-CN');
    const { default: i18n } = await import('./index');
    await i18n.changeLanguage('zh-CN');

    expect(i18n.t('settings.title')).toBe('设置');
  });

  it('maps browser language zh to Simplified Chinese', async () => {
    setBrowserLanguage('zh');
    const { default: i18n } = await import('./index');
    await flushInit();

    expect(i18n.language).toBe('zh-CN');
    expect(i18n.t('settings.title')).toBe('设置');
  });

  it('maps browser language zh-Hans to Simplified Chinese', async () => {
    setBrowserLanguage('zh-Hans');
    const { default: i18n } = await import('./index');
    await flushInit();

    expect(i18n.language).toBe('zh-CN');
    expect(i18n.t('settings.title')).toBe('设置');
  });

  it('falls back to English for Traditional Chinese variants', async () => {
    setBrowserLanguage('zh-TW');
    const { default: i18n } = await import('./index');
    await flushInit();

    expect(i18n.language).toBe('en');
    expect(i18n.t('settings.title')).toBe('Settings');
  });

  it('falls back to English for zh-HK', async () => {
    setBrowserLanguage('zh-HK');
    const { default: i18n } = await import('./index');
    await flushInit();

    expect(i18n.language).toBe('en');
    expect(i18n.t('settings.title')).toBe('Settings');
  });

  it('persists explicit language choice in localStorage', async () => {
    const { default: i18n } = await import('./index');
    await i18n.changeLanguage('zh-CN');

    expect(localStorage.getItem('i18nextLng')).toBe('zh-CN');
  });
});

// i18next-browser-languagedetector reads `navigator.languages` (the array)
// before `navigator.language`, so both must be overridden to simulate a
// browser locale in jsdom. This keeps tests independent of the host browser.
function setBrowserLanguage(language: string): void {
  Object.defineProperty(window.navigator, 'language', {
    value: language,
    configurable: true,
  });
  Object.defineProperty(window.navigator, 'languages', {
    value: [language],
    configurable: true,
  });
}

// i18next initializes synchronously when resources are bundled inline, but the
// init promise is fired with `void` in the initializer. Flushing the microtask
// queue guarantees detection has settled before assertions in tests that rely
// on browser-language detection rather than an explicit changeLanguage call.
async function flushInit(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
