import {useQuery} from '@tanstack/react-query';
import {recommendationsApi} from '../api/recommendations.api';

/**
 * Centralized query keys for TanStack Query caching and invalidation.
 */
export const recommendationKeys = {
    all: ['recommendations'] as const,
    shelves: () => [...recommendationKeys.all, 'shelves'] as const,
    autoplay: (mode: string, contextId?: string) => [...recommendationKeys.all, 'autoplay', mode, contextId] as const,
};

/**
 * Fetches the multi-lane discovery dashboard.
 * Includes a 5-minute staleTime to prevent redundant AI recalculations
 * and database vector queries when the user rapidly navigates between pages.
 */
export const useDiscoveryShelves = (enabled: boolean = true) => {
    return useQuery({
        queryKey: recommendationKeys.shelves(),
        queryFn: recommendationsApi.getDiscoveryShelves,
        staleTime: 1000 * 60 * 5,
        enabled,
        retry: 1, // Fail fast on 400 Bad Request (Cold Start trigger)
    });
};