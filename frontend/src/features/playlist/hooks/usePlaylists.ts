import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {playlistApi} from '../api/playlist.api';
import toast from 'react-hot-toast';
import type {
    CreatePlaylistPayload,
    UpdatePlaylistPayload,
    PageResponse,
    PlaylistDto,
    PlaylistTrackDto,
    TrackMetadataPayload
} from '../types';

// Query Key Factory for strict cache management
export const playlistKeys = {
    all: ['playlists'] as const,
    library: () => [...playlistKeys.all, 'library'] as const,
    detail: (id: string) => [...playlistKeys.all, 'detail', id] as const,
    liked: () => [...playlistKeys.all, 'liked'] as const,
    tracks: (id: string) => [...playlistKeys.all, 'tracks', id] as const,
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
 * Generic hook to toggle a track's presence in a specific playlist.
 * Implements strict optimistic cache updates.
 */
export const useTogglePlaylistTrack = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({playlistId, track, isPresent}: {
            playlistId: string;
            track: TrackMetadataPayload;
            isPresent: boolean
        }) => {
            if (isPresent) {
                return playlistApi.removeTrack(playlistId, track.id);
            } else {
                return playlistApi.addTrack(playlistId, track.id);
            }
        },
        onMutate: async ({playlistId, track, isPresent}) => {
            await queryClient.cancelQueries({queryKey: playlistKeys.tracks(playlistId)});

            const previousTracks = queryClient.getQueryData<PageResponse<PlaylistTrackDto>>(playlistKeys.tracks(playlistId));

            if (previousTracks) {
                const optimisticTrack: PlaylistTrackDto = {
                    trackId: track.id,
                    title: track.title,
                    artistId: track.artistId,
                    durationSeconds: track.durationSeconds,
                    coverMinioPath: track.coverMinioPath,
                    addedByUserId: 'optimistic',
                    addedAt: new Date().toISOString()
                };

                queryClient.setQueryData<PageResponse<PlaylistTrackDto>>(
                    playlistKeys.tracks(playlistId),
                    {
                        ...previousTracks,
                        content: isPresent
                            ? previousTracks.content.filter(t => t.trackId !== track.id)
                            : [...previousTracks.content, optimisticTrack]
                    }
                );
            }

            return {previousTracks, playlistId};
        },
        onError: (_err, _variables, context) => {
            if (context?.previousTracks && context?.playlistId) {
                queryClient.setQueryData(playlistKeys.tracks(context.playlistId), context.previousTracks);
            }
            toast.error('Action failed. Reverting.');
        },
        onSettled: (_data, _error, _variables, context) => {
            queryClient.invalidateQueries({queryKey: playlistKeys.library()});
            if (context?.playlistId) {
                queryClient.invalidateQueries({queryKey: playlistKeys.tracks(context.playlistId)});
            }
        }
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
        mutationFn: async ({track, isLiked}: { track: TrackMetadataPayload; isLiked: boolean }) => {
            const likedPlaylist = library?.content.find(p => p.isSystem && p.name === 'Liked Tracks');
            if (!likedPlaylist) throw new Error("Liked Tracks playlist not found");

            if (isLiked) {
                return playlistApi.removeTrack(likedPlaylist.id, track.id);
            } else {
                return playlistApi.addTrack(likedPlaylist.id, track.id);
            }
        },
        onMutate: async ({track, isLiked}) => {
            const likedPlaylist = library?.content.find(p => p.isSystem && p.name === 'Liked Tracks');
            if (!likedPlaylist) return;

            await queryClient.cancelQueries({queryKey: playlistKeys.tracks(likedPlaylist.id)});

            const previousTracks = queryClient.getQueryData<PageResponse<PlaylistTrackDto>>(playlistKeys.tracks(likedPlaylist.id));

            if (previousTracks) {
                const optimisticTrack: PlaylistTrackDto = {
                    trackId: track.id,
                    title: track.title,
                    artistId: track.artistId,
                    durationSeconds: track.durationSeconds,
                    coverMinioPath: track.coverMinioPath,
                    addedByUserId: 'optimistic',
                    addedAt: new Date().toISOString()
                };

                queryClient.setQueryData<PageResponse<PlaylistTrackDto>>(
                    playlistKeys.tracks(likedPlaylist.id),
                    {
                        ...previousTracks,
                        content: isLiked
                            ? previousTracks.content.filter(t => t.trackId !== track.id)
                            : [...previousTracks.content, optimisticTrack]
                    }
                );
            }

            return {previousTracks, likedPlaylistId: likedPlaylist.id};
        },
        onError: (_err, _variables, context) => {
            if (context?.previousTracks && context?.likedPlaylistId) {
                queryClient.setQueryData(playlistKeys.tracks(context.likedPlaylistId), context.previousTracks);
            }
            toast.error('Sync failed');
        },
        onSettled: (_data, _error, _variables, context) => {
            queryClient.invalidateQueries({queryKey: playlistKeys.library()});
            if (context?.likedPlaylistId) {
                queryClient.invalidateQueries({queryKey: playlistKeys.tracks(context.likedPlaylistId)});
            }
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