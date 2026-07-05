import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './resources/en';
import zhCN from './resources/zh-CN';

const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
} as const;

const syncDocumentTitle = () => {
  document.title = i18n.t('app.title');
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['en', 'zh-CN'],
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      convertDetectedLanguage: (language) => {
        const normalized = language.toLowerCase();
        if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') {
          return 'zh-CN';
        }
        // Traditional Chinese (zh-TW, zh-HK, ...) and any other zh variant
        // are not supported in v1; redirect to English so i18next does not
        // partial-match the shared "zh" base language to zh-CN.
        if (normalized.startsWith('zh')) {
          return 'en';
        }
        if (normalized.startsWith('en')) {
          return 'en';
        }
        return language;
      },
    },
    react: { useSuspense: false },
  })
  .then(syncDocumentTitle);

i18n.on('languageChanged', syncDocumentTitle);

export default i18n;
