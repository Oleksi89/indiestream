import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {DEFAULT_LOCALE, isSupportedLocale, type Locale} from '@/shared/lib/i18n/i18n';

interface LocaleState {
    locale: Locale;
    setLocale: (locale: Locale) => void;
}

/**
 * Global client-side state for the active interface language.
 *
 * Persisted to localStorage so the user's language choice survives reloads. On
 * rehydration any unknown/removed locale value is coerced back to
 * {@link DEFAULT_LOCALE} to keep the store in a valid state across schema changes.
 */
export const useLocaleStore = create<LocaleState>()(
    persist(
        (set) => ({
            locale: DEFAULT_LOCALE,
            setLocale: (locale) => set({locale}),
        }),
        {
            name: 'indiestream-locale',
            version: 1,
            merge: (persisted, current) => {
                const persistedLocale = (persisted as Partial<LocaleState> | undefined)?.locale;
                return {
                    ...current,
                    locale: persistedLocale && isSupportedLocale(persistedLocale)
                        ? persistedLocale
                        : DEFAULT_LOCALE,
                };
            },
        }
    )
);
