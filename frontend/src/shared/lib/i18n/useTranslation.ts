import {useLocaleStore} from '@/shared/store/localeStore';
import {getDictionary, type Locale, type Translations} from './i18n';

interface UseTranslationResult {
    /** The resolved dictionary for the active locale. */
    t: Translations;
    /** The currently active locale. */
    locale: Locale;
}

/**
 * Bridges the global {@link useLocaleStore} client state with the static i18n
 * dictionaries. Components read copy through `t` and re-render automatically
 * when the user switches language.
 *
 * @example
 * const {t} = useTranslation();
 * return <h1>{t.settings.title}</h1>;
 */
export const useTranslation = (): UseTranslationResult => {
    const locale = useLocaleStore(state => state.locale);
    return {t: getDictionary(locale), locale};
};
