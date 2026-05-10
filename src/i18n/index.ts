import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import de from './locales/de.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  ja: { translation: ja },
  ko: { translation: ko },
  de: { translation: de },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'ja', 'ko', 'de'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
export const supportedLangs = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'es', label: 'Espanol', flag: 'ES' },
  { code: 'ja', label: 'Japanese', flag: 'JP' },
  { code: 'ko', label: 'Korean', flag: 'KR' },
  { code: 'de', label: 'German', flag: 'DE' },
] as const;
