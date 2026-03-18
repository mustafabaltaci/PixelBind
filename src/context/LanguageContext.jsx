import React, { createContext, useContext, useState } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();
const getStoredLanguage = () => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  return window.localStorage.getItem('lang') === 'tr' ? 'tr' : 'en';
};

export const LanguageProvider = ({ children }) => {
  // Persist the last selected locale so reloads keep the same UI language.
  const [lang, setLang] = useState(getStoredLanguage);

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'tr' : 'en';
    setLang(newLang);
    window.localStorage.setItem('lang', newLang);
  };

  const t = (key) => {
    // Fall back to the key itself to avoid rendering blank labels during development.
    return translations[lang]?.[key] ?? translations.en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
