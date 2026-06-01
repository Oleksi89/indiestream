import {useQuery, keepPreviousData} from '@tanstack/react-query';
import {searchApi} from '../api/search.api';
import {useDebounce} from '@/shared/hooks/useDebounce';

/**
 * Hook optimized for the Navbar Quick Search.
 * Includes a 300ms debounce to prevent API spam while typing.
 */
export const useQuickSearch = (query: string) => {
    const debouncedQuery = useDebounce(query, 300);

    return useQuery({
        queryKey: ['search', 'quick', debouncedQuery],
        queryFn: () => searchApi.quickSearch(debouncedQuery, 3),
        enabled: debouncedQuery.trim().length >= 2,
        placeholderData: keepPreviousData, // Prevents layout shift/flickering while typing new characters
        staleTime: 1000 * 60 * 2, // 2 minutes cache
    });
};

/**
 * Hook optimized for the dedicated Full Search page.
 */
export const useFullSearch = (query: string, tags: string, genre: string, enabled: boolean = true) => {
    const debouncedQuery = useDebounce(query, 300);
    const debouncedTags = useDebounce(tags, 300);

    const hasValidQuery = debouncedQuery.trim().length >= 2;
    const hasValidTags = debouncedTags.trim().length > 0;
    const hasValidGenre = genre.trim().length > 0;

    return useQuery({
        queryKey: ['search', 'full', debouncedQuery, debouncedTags, genre],
        queryFn: () => searchApi.fullSearch(debouncedQuery, genre, debouncedTags, 30),
        enabled: enabled && (hasValidQuery || hasValidTags || hasValidGenre),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 2,
    });
};