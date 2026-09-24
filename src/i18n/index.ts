/**
 * i18n scaffold — English default, Urdu-ready.
 * Swap dictionaries without touching game engine.
 */

export type Locale = 'en' | 'ur';

type Dictionary = {
  appName: string;
  playOffline: string;
  playOnline: string;
  howToPlay: string;
  settings: string;
  noGambling: string;
  yourTurn: string;
  thulla: string;
  bhabhi: string;
  escaped: string;
};

const en: Dictionary = {
  appName: 'Bhabi Thulla',
  playOffline: 'Play Offline',
  playOnline: 'Play Online',
  howToPlay: 'How to Play',
  settings: 'Settings',
  noGambling: 'No gambling · No betting · No real money',
  yourTurn: 'Your turn',
  thulla: 'Thulla!',
  bhabhi: 'is Bhabhi',
  escaped: 'escaped',
};

/** Placeholder Urdu strings — expand over time */
const ur: Dictionary = {
  appName: 'بھابی تھلا',
  playOffline: 'آف لائن کھیلیں',
  playOnline: 'آن لائن کھیلیں',
  howToPlay: 'کھیلنے کا طریقہ',
  settings: 'ترتیبات',
  noGambling: 'جوا نہیں · شرط نہیں · حقیقی رقم نہیں',
  yourTurn: 'آپ کی باری',
  thulla: 'تھلا!',
  bhabhi: 'بھابی ہیں',
  escaped: 'بچ گئے',
};

const catalogs: Record<Locale, Dictionary> = { en, ur };

export function t(locale: Locale, key: keyof Dictionary): string {
  return catalogs[locale][key] ?? catalogs.en[key];
}

export type TranslationKey = keyof Dictionary;
