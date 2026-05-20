import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {profileApi} from '../api/profile.api';
import type {UserDto} from '@/features/auth/types';
import toast from 'react-hot-toast';
import {isAxiosError} from 'axios';

export const profileKeys = {
    all: ['profiles'] as const,
    detail: (username: string) => [...profileKeys.all, username] as const,
};

/**
 * Fetches user profile. Includes strict caching and stale-time parameters.
 */
export const useUserProfile = (username: string) => {
    return useQuery({
        queryKey: profileKeys.detail(username),
        queryFn: () => profileApi.getProfile(username),
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: !!username,
    });
};

/**
 * Handles follow action with zero-latency Optimistic UI cache injection.
 */
export const useFollowMutation = (username: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => profileApi.followUser(username),
        onMutate: async () => {
            await queryClient.cancelQueries({queryKey: profileKeys.detail(username)});
            const previousProfile = queryClient.getQueryData<UserDto>(profileKeys.detail(username));

            if (previousProfile) {
                queryClient.setQueryData<UserDto>(profileKeys.detail(username), {
                    ...previousProfile,
                    isFollowedByMe: true,
                    followersCount: (previousProfile.followersCount || 0) + 1,
                });
            }
            return {previousProfile};
        },
        onError: (err, _variables, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(profileKeys.detail(username), context.previousProfile);
            }

            const errorMessage = isAxiosError(err) && err.response?.data?.detail
                ? err.response.data.detail
                : 'Failed to follow user. Please try again.';

            toast.error(errorMessage);
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: profileKeys.detail(username)});
        },
    });
};

export const useUnfollowMutation = (username: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => profileApi.unfollowUser(username),
        onMutate: async () => {
            await queryClient.cancelQueries({queryKey: profileKeys.detail(username)});
            const previousProfile = queryClient.getQueryData<UserDto>(profileKeys.detail(username));

            if (previousProfile) {
                queryClient.setQueryData<UserDto>(profileKeys.detail(username), {
                    ...previousProfile,
                    isFollowedByMe: false,
                    followersCount: Math.max(0, (previousProfile.followersCount || 1) - 1),
                });
            }
            return {previousProfile};
        },
        onError: (err, _variables, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(profileKeys.detail(username), context.previousProfile);
            }

            const errorMessage = isAxiosError(err) && err.response?.data?.detail
                ? err.response.data.detail
                : 'Failed to unfollow user.';

            toast.error(errorMessage);
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: profileKeys.detail(username)});
        },
    });
};