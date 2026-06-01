import {useSearchParams} from 'react-router-dom';
import {useCallback} from 'react';

export type SearchTab = 'all' | 'tracks' | 'artists' | 'playlists';

interface SearchFilters {
    q?: string;
    tab?: SearchTab;
    genre?: string;
    tags?: string;
}

/**
 * Ensures strict synchronization between React State and the Browser URL.
 * Enables users to share direct links to specific search queries and filter combinations.
 */
export const useSearchFilters = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const query = searchParams.get('q') || '';
    const tab = (searchParams.get('tab') as SearchTab) || 'all';
    const genre = searchParams.get('genre') || '';
    const tags = searchParams.get('tags') || '';

    const setFilters = useCallback((filters: SearchFilters) => {
        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);

            if (filters.q !== undefined) {
                if (filters.q.trim()) newParams.set('q', filters.q.trim());
                else newParams.delete('q');
            }
            if (filters.tab !== undefined) {
                if (filters.tab !== 'all') newParams.set('tab', filters.tab);
                else newParams.delete('tab');
            }
            if (filters.genre !== undefined) {
                if (filters.genre) newParams.set('genre', filters.genre);
                else newParams.delete('genre');
            }
            if (filters.tags !== undefined) {
                if (filters.tags) newParams.set('tags', filters.tags);
                else newParams.delete('tags');
            }

            return newParams;
        }, {replace: true}); // replace to prevent blowing up the browser history stack while typing
    }, [setSearchParams]);

    return {query, tab, genre, tags, setFilters};
};