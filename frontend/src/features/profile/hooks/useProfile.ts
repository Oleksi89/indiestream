import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {profileApi} from '../api/profile.api';
import type {UserProfileResponse} from '@/features/auth/types';
import toast from 'react-hot-toast';
import {isAxiosError} from 'axios';
import {libraryKeys} from '@/features/library/hooks/useLibrary';
import type {LibraryItemDto} from '@/features/library/types';

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
            await queryClient.cancelQueries({queryKey: libraryKeys.me()});

            const previousProfile = queryClient.getQueryData<UserProfileResponse>(profileKeys.detail(username));
            const previousLibrary = queryClient.getQueryData<LibraryItemDto[]>(libraryKeys.me());

            if (previousProfile) {
                queryClient.setQueryData<UserProfileResponse>(profileKeys.detail(username), {
                    ...previousProfile,
                    isFollowedByMe: true,
                    followersCount: (previousProfile.followersCount || 0) + 1,
                });

                if (previousLibrary) {
                    const optimisticLibraryItem: LibraryItemDto = {
                        id: previousProfile.id,
                        type: 'FOLLOWED_PROFILE',
                        title: previousProfile.alias,
                        imageUrl: previousProfile.profile?.avatarPath || null,
                        subtitle: `Profile • @${previousProfile.username}`,
                        addedAt: new Date().toISOString()
                    };
                    queryClient.setQueryData<LibraryItemDto[]>(libraryKeys.me(), [optimisticLibraryItem, ...previousLibrary]);
                }
            }
            return {previousProfile, previousLibrary};
        },
        onError: (err, _variables, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(profileKeys.detail(username), context.previousProfile);
            }
            if (context?.previousLibrary) {
                queryClient.setQueryData(libraryKeys.me(), context.previousLibrary);
            }

            const errorMessage = isAxiosError(err) && err.response?.data?.detail
                ? err.response.data.detail
                : 'Failed to follow user. Please try again.';

            toast.error(errorMessage);
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: profileKeys.detail(username)});
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
        },
    });
};

export const useUnfollowMutation = (username: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => profileApi.unfollowUser(username),
        onMutate: async () => {
            await queryClient.cancelQueries({queryKey: profileKeys.detail(username)});
            await queryClient.cancelQueries({queryKey: libraryKeys.me()});

            const previousProfile = queryClient.getQueryData<UserProfileResponse>(profileKeys.detail(username));
            const previousLibrary = queryClient.getQueryData<LibraryItemDto[]>(libraryKeys.me());

            if (previousProfile) {
                queryClient.setQueryData<UserProfileResponse>(profileKeys.detail(username), {
                    ...previousProfile,
                    isFollowedByMe: false,
                    followersCount: Math.max(0, (previousProfile.followersCount || 1) - 1),
                });

                if (previousLibrary) {
                    queryClient.setQueryData<LibraryItemDto[]>(
                        libraryKeys.me(),
                        previousLibrary.filter(item => item.id !== previousProfile.id)
                    );
                }
            }
            return {previousProfile, previousLibrary};
        },
        onError: (err, _variables, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(profileKeys.detail(username), context.previousProfile);
            }
            if (context?.previousLibrary) {
                queryClient.setQueryData(libraryKeys.me(), context.previousLibrary);
            }

            const errorMessage = isAxiosError(err) && err.response?.data?.detail
                ? err.response.data.detail
                : 'Failed to unfollow user.';

            toast.error(errorMessage);
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: profileKeys.detail(username)});
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
        },
    });
};