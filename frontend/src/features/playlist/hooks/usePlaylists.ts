import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {playlistApi} from '../api/playlist.api';
import toast from 'react-hot-toast';
import type {CreatePlaylistPayload, UpdatePlaylistPayload, PageResponse, PlaylistDto} from '../types';

// Query Key Factory for strict cache management
export const playlistKeys = {
    all: ['playlists'] as const,
    library: () => [...playlistKeys.all, 'library'] as const,
    detail: (id: string) => [...playlistKeys.all, 'detail', id] as const,
    liked: () => [...playlistKeys.all, 'liked'] as const,
};

export const useUserLibrary = (page: number = 0, size: number = 50) => {
    return useQuery({
        queryKey: [...playlistKeys.library(), page, size],
        queryFn: () => playlistApi.getUserLibrary(page, size),
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
};

export const useCreatePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreatePlaylistPayload) => playlistApi.createPlaylist(payload),
        onSuccess: () => {
            toast.success('Playlist created');
            queryClient.invalidateQueries({queryKey: playlistKeys.library()});
        },
        onError: () => toast.error('Failed to create playlist'),
    });
};

export const useUpdatePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({id, payload}: { id: string; payload: UpdatePlaylistPayload }) =>
            playlistApi.updatePlaylist(id, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: playlistKeys.library()});
            queryClient.invalidateQueries({queryKey: playlistKeys.detail(variables.id)});
        },
        onError: () => toast.error('Failed to update playlist'),
    });
};

export const useDeletePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (playlistId: string) => playlistApi.deletePlaylist(playlistId),
        onSuccess: () => {
            toast.success('Playlist deleted');
            queryClient.invalidateQueries({queryKey: playlistKeys.library()});
        },
        onError: () => toast.error('Failed to delete playlist'),
    });
};

export const useDuplicatePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (playlistId: string) => playlistApi.duplicatePlaylist(playlistId),
        onSuccess: () => {
            toast.success('Playlist duplicated');
            queryClient.invalidateQueries({queryKey: playlistKeys.library()});
        },
        onError: () => toast.error('Failed to duplicate playlist'),
    });
};

/**
 * Hook to toggle the "Like" state of a track.
 * Automatically resolves the user's system "Liked Tracks" playlist.
 */
export const useToggleLike = () => {
    const queryClient = useQueryClient();
    const {data: library} = useUserLibrary();

    return useMutation({
        mutationFn: async ({trackId, isLiked}: { trackId: string; isLiked: boolean }) => {
            const likedPlaylist = library?.content.find(p => p.isSystem && p.name === 'Liked Tracks');
            if (!likedPlaylist) throw new Error("Liked Tracks playlist not found");

            if (isLiked) {
                return playlistApi.removeTrack(likedPlaylist.id, trackId);
            } else {
                return playlistApi.addTrack(likedPlaylist.id, trackId);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: playlistKeys.library()});
            toast.success('Library updated');
        }
    });
};

export const useFollowPlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (playlistId: string) => playlistApi.followPlaylist(playlistId),
        onSuccess: () => {
            toast.success('Added to Library');
            queryClient.invalidateQueries({queryKey: playlistKeys.library()});
        },
        onError: () => toast.error('Failed to follow playlist'),
    });
};

/**
 * Optimistic mutation for unfollowing a playlist.
 * Provides instant UI feedback by manually updating the React Query cache.
 */
export const useUnfollowPlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (playlistId: string) => playlistApi.unfollowPlaylist(playlistId),
        onMutate: async (playlistId) => {
            await queryClient.cancelQueries({queryKey: playlistKeys.library()});

            const previousLibrary = queryClient.getQueryData<PageResponse<PlaylistDto>>(
                [...playlistKeys.library(), 0, 50]
            );

            if (previousLibrary) {
                queryClient.setQueryData<PageResponse<PlaylistDto>>(
                    [...playlistKeys.library(), 0, 50],
                    {
                        ...previousLibrary,
                        content: previousLibrary.content.filter(p => p.id !== playlistId),
                    }
                );
            }

            return {previousLibrary};
        },
        onError: (_err, _variables, context) => {
            if (context?.previousLibrary) {
                queryClient.setQueryData([...playlistKeys.library(), 0, 50], context.previousLibrary);
            }
            toast.error('Failed to remove from Library. Reverting.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: playlistKeys.library()});
        },
    });
};