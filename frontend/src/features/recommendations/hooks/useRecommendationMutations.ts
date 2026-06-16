import {useMutation, useQueryClient} from '@tanstack/react-query';
import {recommendationsApi} from '../api/recommendations.api';
import {recommendationKeys} from './useRecommendationQueries';
import type {DiscoveryShelvesDto} from '../types';
import toast from 'react-hot-toast';
import {useAuthStore} from "@/shared/store/authStore";

/**
 * Mutation hook for negative AI interactions with Optimistic UI updates.
 */
export const useNotInterestedMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: recommendationsApi.markNotInterested,
        onMutate: async (trackId) => {
            // 1. Cancel any outgoing refetches so they don't overwrite optimistic update
            await queryClient.cancelQueries({queryKey: recommendationKeys.shelves()});

            // 2. Snapshot the previous value
            const previousShelves = queryClient.getQueryData<DiscoveryShelvesDto>(recommendationKeys.shelves());

            // 3. Optimistically update the cache by purging the track from all shelf arrays
            if (previousShelves) {
                queryClient.setQueryData<DiscoveryShelvesDto>(recommendationKeys.shelves(), {
                    ...previousShelves,
                    madeForYou: previousShelves.madeForYou.filter(t => t.id !== trackId),
                    listenersLikeYou: previousShelves.listenersLikeYou.filter(t => t.id !== trackId),
                });
            }

            // 4. Return context containing the snapshot to roll back if the mutation fails
            return {previousShelves};
        },
        onError: (_err, _trackId, context) => {
            // Rollback on failure
            if (context?.previousShelves) {
                queryClient.setQueryData(recommendationKeys.shelves(), context.previousShelves);
            }
            toast.error("Failed to update preferences. Please try again.");
        },
        onSettled: () => {
            // Note: Avoid an automatic invalidateQueries here to prevent the UI from
            // "flashing" or re-fetching the entire heavy dashboard immediately after a single interaction.
        }
    });
};


/**
 * Mutation hook for resetting the user's AI taste algorithm.
 * Forces a local state update to trigger the Onboarding Guard upon success.
 */
export const useResetTasteProfileMutation = () => {
    const queryClient = useQueryClient();
    const setUser = useAuthStore(state => state.setUser);
    const user = useAuthStore(state => state.user);

    return useMutation({
        mutationFn: recommendationsApi.resetTasteProfile,
        onSuccess: () => {
            // Invalidate AI caches
            queryClient.invalidateQueries({queryKey: recommendationKeys.all});

            // Force the UI into the Onboarding state by updating the local user object
            if (user) {
                setUser({
                    ...user,
                    profile: {
                        ...user.profile,
                        needsTasteCalibration: true
                    }
                } as any);
            }

            toast.success("Algorithm reset successfully. Redirecting to calibration...");
            // The router guard will automatically catch this
            // state change and redirect the user to the Onboarding UI.
        },
        onError: () => {
            toast.error("Failed to reset algorithm. Please try again.");
        }
    });
};