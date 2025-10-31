import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import * as en from './locales/en.json';
import * as ja from './locales/ja.json';

const resources = {
  en: { translation: en },
  ja: { translation: ja },
};

// 言語自動判定とLocalStorage保存機能
const getInitialLanguage = (): string => {
  // 1. LocalStorageに保存された言語設定を優先
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage && resources[savedLanguage as keyof typeof resources]) {
    return savedLanguage;
  }

  // 2. ブラウザの言語設定から自動判定
  const browserLanguage = navigator.language.toLowerCase();

  // 完全一致を確認
  if (resources[browserLanguage as keyof typeof resources]) {
    return browserLanguage;
  }

  // 言語コードのみで一致を確認（例: "ja-JP" -> "ja"）
  const langCode = browserLanguage.split('-')[0];
  if (langCode && resources[langCode as keyof typeof resources]) {
    return langCode;
  }

  // デフォルト言語
  return 'ja';
};

// 言語変更時にLocalStorageに保存
const saveLanguageToStorage = (language: string) => {
  localStorage.setItem('language', language);
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'ja',
  interpolation: {
    escapeValue: false,
  },
});

// 言語変更イベントリスナーを追加
i18n.on('languageChanged', (lng) => {
  saveLanguageToStorage(lng);
});

export default i18n;
