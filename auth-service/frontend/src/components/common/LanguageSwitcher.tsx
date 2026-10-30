import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageSwitcherProps {
  idPrefix?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ idPrefix = 'nav' }) => {
  const { lang, setLanguage } = useLanguage();

  return (
    <div className="lang-switcher" title="Switch Language / Chuyển Đổi Ngôn Ngữ">
      <button
        type="button"
        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
        id={`${idPrefix}-lang-btn-en`}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={`lang-btn ${lang === 'vi' ? 'active' : ''}`}
        id={`${idPrefix}-lang-btn-vi`}
        onClick={() => setLanguage('vi')}
      >
        VI
      </button>
    </div>
  );
};
