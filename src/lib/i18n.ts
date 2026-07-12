import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from '../locales/en.json';
import pt from '../locales/pt.json';
import es from '../locales/es.json';

const resources = {
  en: { translation: en },
  "pt-BR": { translation: pt },
  pt: { translation: pt },
  es: { translation: es }
};

const LANGUAGE_KEY = 'openband_language';

const initI18n = async () => {
  let savedLanguage = null;
  
  try {
    if (typeof localStorage !== 'undefined') {
      savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    }
  } catch (e) {
    // Ignore error
  }

  const deviceLanguageRaw = getLocales()[0]?.languageCode || 'en';
  const deviceLanguage =
    deviceLanguageRaw === 'pt' ? 'pt-BR' : deviceLanguageRaw;

  const initialLanguage = savedLanguage || (resources[deviceLanguage as keyof typeof resources] ? deviceLanguage : 'pt-BR');

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, 
      }
    });
};

initI18n();

export const useT = () => useTranslation().t;

export const changeLanguage = async (lng: string) => {
  await i18n.changeLanguage(lng);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_KEY, lng);
    }
  } catch (e) {
    // Ignore error
  }
};

export default i18n;
