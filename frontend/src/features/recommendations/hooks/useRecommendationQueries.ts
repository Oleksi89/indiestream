import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {recommendationsApi} from '../api/recommendations.api';
import {apiClient} from "@/shared/api/apiClient.ts";
import type {TrackDto} from "@/features/media/types";

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

/**
 * Fetches the initial "Cold Start" tracks based on manually selected genres.
 * Bypasses cache entirely since this is a one-time onboarding action.
 */
export const useOnboardingTracks = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (genres: string[]) => {
            const params = new URLSearchParams();
            genres.forEach(g => params.append('genres', g));

            const {data} = await apiClient.get<TrackDto[]>(`/recommendations/onboarding?${params.toString()}`);
            return data;
        },
        onSuccess: (tracks) => {
            // Pre-seed the cache for instantaneous playback
            queryClient.setQueryData(['onboarding-tracks'], tracks);
        }
    });
};