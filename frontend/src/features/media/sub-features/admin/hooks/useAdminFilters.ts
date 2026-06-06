import {useSearchParams} from 'react-router-dom';
import {useCallback, useMemo} from 'react';
import type {TrackStatus} from '../../../types';

/**
 * Standardizes URL search parameters for the Admin Registry.
 * Ensures the URL is the single source of truth for the data grid state.
 */
export const useAdminFilters = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse values from URL or set defaults
    const page = parseInt(searchParams.get('page') || '0', 10);
    const size = parseInt(searchParams.get('size') || '50', 10);
    const query = searchParams.get('query') || '';
    const statuses = searchParams.getAll('statuses') as TrackStatus[];
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const sort = searchParams.get('sort') || 'createdAt,desc';

    // Stable updater function
    const setFilters = useCallback((updates: {
        page?: number;
        size?: number;
        query?: string;
        statuses?: TrackStatus[];
        startDate?: string;
        endDate?: string;
        sort?: string;
    }) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);

            if (updates.page !== undefined) next.set('page', String(updates.page));
            if (updates.size !== undefined) next.set('size', String(updates.size));
            if (updates.sort !== undefined) next.set('sort', updates.sort);

            if (updates.query !== undefined) {
                if (updates.query) next.set('query', updates.query);
                else next.delete('query');
                next.set('page', '0'); // Reset page on new search
            }

            if (updates.statuses !== undefined) {
                next.delete('statuses');
                updates.statuses.forEach(s => next.append('statuses', s));
                next.set('page', '0'); // Reset page on filter change
            }

            if (updates.startDate !== undefined) {
                if (updates.startDate) next.set('startDate', updates.startDate);
                else next.delete('startDate');
            }

            if (updates.endDate !== undefined) {
                if (updates.endDate) next.set('endDate', updates.endDate);
                else next.delete('endDate');
            }

            return next;
        }, {replace: true}); // Prevent massive browser history stacks
    }, [setSearchParams]);

    // Derived object for the API payload
    const apiFilters = useMemo(() => ({
        page, size, query, statuses, startDate, endDate, sort
    }), [page, size, query, statuses, startDate, endDate, sort]);

    return {
        filters: apiFilters,
        setFilters
    };
};