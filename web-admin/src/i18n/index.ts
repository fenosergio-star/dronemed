import { fr } from './fr';
import { mg } from './mg';

export const translations = { fr, mg };
export type Lang = keyof typeof translations;
export type TranslationKeys = typeof fr;

export function t(lang: Lang, path: string): string {
  const keys = path.split('.');
  let value: any = translations[lang];
  for (const key of keys) {
    value = value?.[key];
  }
  return value ?? path;
}

let currentLang: Lang = 'fr';

export function setLang(lang: Lang): void {
  currentLang = lang;
}

export function getLang(): Lang {
  return currentLang;
}

export function useT(): (path: string) => string {
  return (path: string) => t(currentLang, path);
}
