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
import {libraryKeys} from "@/features/library/hooks/useLibrary";
import type {LibraryItemDto} from "@/features/library/types";

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
        staleTime: 1000 * 60 * 5,
    });
};

export const useCreatePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreatePlaylistPayload) => playlistApi.createPlaylist(payload),
        onSuccess: () => {
            toast.success('Playlist created');
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
        },
        onError: () => toast.error('Failed to create playlist'),
    });
};

export const useUpdatePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({id, payload}: { id: string; payload: UpdatePlaylistPayload }) =>
            playlistApi.updatePlaylist(id, payload),
        onMutate: async ({id, payload}) => {
            await queryClient.cancelQueries({queryKey: playlistKeys.detail(id)});
            const previousPlaylist = queryClient.getQueryData<PlaylistDto>(playlistKeys.detail(id));

            if (previousPlaylist) {
                queryClient.setQueryData<PlaylistDto>(playlistKeys.detail(id), {
                    ...previousPlaylist,
                    ...payload,
                });
            }
            return {previousPlaylist, id};
        },
        onError: (_err, _variables, context) => {
            if (context?.previousPlaylist) {
                queryClient.setQueryData(playlistKeys.detail(context.id), context.previousPlaylist);
            }
            toast.error('Failed to update playlist details');
        },
        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
            queryClient.invalidateQueries({queryKey: playlistKeys.detail(variables.id)});
        },
    });
};

export const useUploadPlaylistCover = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({id, file}: { id: string; file: FormData }) => playlistApi.uploadPlaylistCover(id, file),
        onSuccess: (_, variables) => {
            toast.success('Cover image updated');
            queryClient.invalidateQueries({queryKey: playlistKeys.detail(variables.id)});
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
        },
        onError: () => toast.error('Failed to process cover image upload'),
    });
};

export const useDeletePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (playlistId: string) => playlistApi.deletePlaylist(playlistId),
        onSuccess: () => {
            toast.success('Playlist deleted');
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
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
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
        },
        onError: () => toast.error('Failed to duplicate playlist'),
    });
};

export const useTogglePlaylistTrack = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({playlistId, track, isPresent}: {
            playlistId: string;
            track: TrackMetadataPayload;
            isPresent: boolean
        }) => {
            if (isPresent) return playlistApi.removeTrack(playlistId, track.id);
            return playlistApi.addTrack(playlistId, track.id);
        },
        onMutate: async ({playlistId, track, isPresent}) => {
            await queryClient.cancelQueries({queryKey: playlistKeys.tracks(playlistId)});

            const previousTracks = queryClient.getQueryData<PageResponse<PlaylistTrackDto>>(playlistKeys.tracks(playlistId));

            if (previousTracks) {
                const optimisticTrack: PlaylistTrackDto = {
                    trackId: track.id,
                    title: track.title,
                    artistId: track.artistId,
                    artistUsername: track.artistUsername,
                    artistAlias: track.artistAlias || 'Unknown Artist',
                    durationSeconds: track.durationSeconds,
                    coverMinioPath: track.coverMinioPath,
                    stemsMetadata: track.stemsMetadata,
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
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
            if (context?.playlistId) {
                queryClient.invalidateQueries({queryKey: playlistKeys.tracks(context.playlistId)});
            }
        }
    });
};

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
                    artistUsername: track.artistUsername,
                    artistAlias: track.artistAlias || 'Unknown Artist',
                    durationSeconds: track.durationSeconds,
                    coverMinioPath: track.coverMinioPath,
                    stemsMetadata: track.stemsMetadata,
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
        onMutate: async (playlistId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({queryKey: libraryKeys.me()});
            await queryClient.cancelQueries({queryKey: playlistKeys.detail(playlistId)});

            const previousLibrary = queryClient.getQueryData<LibraryItemDto[]>(libraryKeys.me());
            const playlistInfo = queryClient.getQueryData<PlaylistDto>(playlistKeys.detail(playlistId));

            // 1. Optimistically update Library Sidebar
            if (previousLibrary && playlistInfo) {
                const optimisticItem: LibraryItemDto = {
                    id: playlistInfo.id,
                    type: 'FOLLOWED_PLAYLIST',
                    title: playlistInfo.name,
                    imageUrl: playlistInfo.coverMinioPath,
                    subtitle: `Playlist • ${playlistInfo.ownerAlias}`,
                    addedAt: new Date().toISOString()
                };
                queryClient.setQueryData<LibraryItemDto[]>(libraryKeys.me(), [optimisticItem, ...previousLibrary]);
            }

            return {previousLibrary, playlistId};
        },
        onError: (_err, _variables, context) => {
            if (context?.previousLibrary) {
                queryClient.setQueryData(libraryKeys.me(), context.previousLibrary);
            }
            toast.error('Failed to follow playlist');
        },
        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
            queryClient.invalidateQueries({queryKey: playlistKeys.detail(variables)});
        },
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
            // Cancel outgoing refetches
            await queryClient.cancelQueries({queryKey: libraryKeys.me()});
            await queryClient.cancelQueries({queryKey: playlistKeys.detail(playlistId)});

            const previousLibrary = queryClient.getQueryData<LibraryItemDto[]>(libraryKeys.me());

            // Optimistically remove from Library Sidebar
            if (previousLibrary) {
                queryClient.setQueryData<LibraryItemDto[]>(
                    libraryKeys.me(),
                    previousLibrary.filter(item => item.id !== playlistId)
                );
            }

            return {previousLibrary, playlistId};
        },
        onError: (_err, _variables, context) => {
            if (context?.previousLibrary) {
                queryClient.setQueryData(libraryKeys.me(), context.previousLibrary);
            }
            toast.error('Failed to unfollow playlist');
        },
        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
            queryClient.invalidateQueries({queryKey: playlistKeys.detail(variables)});
        },
    });
};