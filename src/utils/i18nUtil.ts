import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko_KR from '@/translations/ko_KR.json';
import en_US from '@/translations/en_US.json';

const resources = {
  ko_KR: {
    translation: ko_KR,
  },
  en_US: {
    translation: en_US,
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'ko_KR',
  fallbackLng: 'ko_KR',
  debug: true,
  interpolation: { escapeValue: true },
  returnObjects: true,
  returnEmptyString: true,
  returnNull: true,
});

export default i18n;