import en from './en';
import de from './de';
import fr from './fr';
import es from './es';
import it from './it';
import nl from './nl';
import pt from './pt';
import pl from './pl';
import tr from './tr';
import sv from './sv';

export const translations: Record<string, Record<string, string>> = { en, de, fr, es, it, nl, pt, pl, tr, sv };

export const languages = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pt', label: 'Português' },
  { code: 'pl', label: 'Polski' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'sv', label: 'Svenska' },
];

export function t(key: string, lang: string = 'en'): string {
  return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
}
