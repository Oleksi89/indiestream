import en from './en.json';
import uk from './uk.json';
/**
 * The English dictionary acts as the single source of truth for the translation
 * schema. Every other locale must structurally conform to this shape, which the
 * compiler enforces via the `Translations` type.
 */
export type Translations = typeof uk;

/**
 * Catalogue of locales the UI is allowed to switch to.
 */
export const SUPPORTED_LOCALES = [
    {code: 'en', label: 'English (US)'},
    {code: 'uk', label: 'Українська (UKR)'},
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number]['code'];

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Registry of loaded dictionaries. Only English is fully translated for now;
 * unregistered locales transparently fall back to {@link DEFAULT_LOCALE} via
 * {@link getDictionary} so adding a translation later requires no call-site changes.
 */
const dictionaries: Partial<Record<Locale, Translations>> = {
    en, uk
};

/**
 * Resolves the dictionary for a locale, falling back to English when the
 * requested locale has not been translated yet.
 */
export const getDictionary = (locale: Locale): Translations =>
    dictionaries[locale] ?? uk;

/** Type guard narrowing an arbitrary string (e.g. a `<select>` value) to a {@link Locale}. */
export const isSupportedLocale = (value: string): value is Locale =>
    SUPPORTED_LOCALES.some(supported => supported.code === value);
