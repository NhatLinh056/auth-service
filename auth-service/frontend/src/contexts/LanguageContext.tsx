import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Language } from '../types/i18n.types';
import { translations } from '../i18n/translations';

interface LanguageContextType {
  lang: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('auth_lang') as Language | null;
    return saved === 'vi' || saved === 'en' ? saved : 'en';
  });

  const setLanguage = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('auth_lang', newLang);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === 'vi'
        ? 'Auth Service — Bảng Điều Khiển Quản Trị & Nhà Phát Triển'
        : 'Auth Service — Developer Console';
  }, [lang]);

  const t = (path: string, fallback = ''): string => {
    const keys = path.split('.');
    let current: any = translations[lang] || translations.en;
    for (const k of keys) {
      if (current && current[k] !== undefined) {
        current = current[k];
      } else {
        return fallback || path;
      }
    }
    return typeof current === 'string' ? current : (fallback || path);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
