import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { translations, languages } from '../i18n';

interface I18nContextValue {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languages: typeof languages;
  customTranslations: Record<string, string>;
  setCustomTranslations: (ct: Record<string, string>) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, initialLang = 'en' }: { children: ReactNode; initialLang?: string }) {
  const [lang, setLang] = useState(initialLang);
  const [customTranslations, setCustomTranslations] = useState<Record<string, string>>({});

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    // Custom translations take highest priority, then built-in for current language, then English fallback
    let str = customTranslations[key] ?? translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  }, [lang, customTranslations]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, languages, customTranslations, setCustomTranslations }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
