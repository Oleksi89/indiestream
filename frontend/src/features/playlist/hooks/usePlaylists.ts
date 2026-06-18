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
import type {UserPublicProfileDto} from "@/features/auth/types";
import {useTranslation} from "@/shared/lib/i18n/useTranslation";

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
    const {t} = useTranslation();

    return useMutation({
        mutationFn: (payload: CreatePlaylistPayload) => playlistApi.createPlaylist(payload),
        onSuccess: () => {
            toast.success(t.playlist.toasts.created);
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
        },
        onError: () => toast.error(t.playlist.toasts.createFailed),
    });
};

export const useUpdatePlaylist = () => {
    const queryClient = useQueryClient();
    const {t} = useTranslation();

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
        onSuccess: () => {
            toast.success(t.playlist.toasts.updated);
        },
        onError: (_err, _variables, context) => {
            if (context?.previousPlaylist) {
                queryClient.setQueryData(playlistKeys.detail(context.id), context.previousPlaylist);
            }
            toast.error(t.playlist.toasts.updateFailed);
        },
        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
            queryClient.invalidateQueries({queryKey: playlistKeys.detail(variables.id)});
        },
    });
};

export const useUploadPlaylistCover = () => {
    const queryClient = useQueryClient();
    const {t} = useTranslation();

    return useMutation({
        mutationFn: ({id, file}: { id: string; file: FormData }) => playlistApi.uploadPlaylistCover(id, file),
        onSuccess: (_, variables) => {
            toast.success(t.playlist.toasts.coverUpdated);
            queryClient.invalidateQueries({queryKey: playlistKeys.detail(variables.id)});
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
        },
        onError: () => toast.error(t.playlist.toasts.coverUpdateFailed),
    });
};

export const useDeletePlaylist = () => {
    const queryClient = useQueryClient();
    const {t} = useTranslation();

    return useMutation({
        mutationFn: (playlistId: string) => playlistApi.deletePlaylist(playlistId),
        onSuccess: () => {
            toast.success(t.playlist.toasts.deleted);
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
        },
        onError: () => toast.error(t.playlist.toasts.deleteFailed),
    });
};

/**
 * Executes a Deep Copy of a playlist and instantly injects the result into the Library sidebar.
 */
export const useDuplicatePlaylist = () => {
    const queryClient = useQueryClient();
    const {t} = useTranslation();

    return useMutation({
        mutationFn: (playlistId: string) => playlistApi.duplicatePlaylist(playlistId),
        onSuccess: (newPlaylist) => {
            // Optimistically map the returned PlaylistDto to a LibraryItemDto
            const newLibraryItem: LibraryItemDto = {
                id: newPlaylist.id,
                type: 'OWNED_PLAYLIST',
                title: newPlaylist.name,
                imageUrl: newPlaylist.coverMinioPath,
                subtitle: `${t.playlist.common.playlist} • ${newPlaylist.ownerAlias}`,
                addedAt: new Date().toISOString(),
                ownerId: newPlaylist.ownerId,
                isCollaborative: false,
                isCollaborator: false
            };

            // Inject directly into the top of the 'library, me' cache
            const previousLibrary = queryClient.getQueryData<LibraryItemDto[]>(libraryKeys.me());
            if (previousLibrary) {
                queryClient.setQueryData<LibraryItemDto[]>(libraryKeys.me(), [newLibraryItem, ...previousLibrary]);
            }

            toast.success(t.playlist.toasts.duplicated);
        },
        onError: () => toast.error(t.playlist.toasts.duplicateFailed),
        onSettled: () => {
            // Background sync to ensure DB consistency
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
        }
    });
};

export const useTogglePlaylistTrack = () => {
    const queryClient = useQueryClient();
    const {t} = useTranslation();

    return useMutation({
        mutationFn: async ({playlistId, track, isPresent}: {
            playlistId: string;
            track: TrackMetadataPayload;
            isPresent: boolean;
            playlistName?: string;
        }) => {
            if (isPresent) return playlistApi.removeTrack(playlistId, track.id);
            return playlistApi.addTrack(playlistId, track.id);
        },
        onMutate: async ({playlistId, track, isPresent}) => {
            await queryClient.cancelQueries({queryKey: playlistKeys.tracks(playlistId)});

            const previousTracks = queryClient.getQueryData<PageResponse<PlaylistTrackDto>>(playlistKeys.tracks(playlistId));
            const optimisticTrack: PlaylistTrackDto = {
                trackId: track.id,
                title: track.title,
                artistId: track.artistId,
                artistUsername: track.artistUsername,
                artistAlias: track.artistAlias || t.playlist.common.unknownArtist,
                durationSeconds: track.durationSeconds,
                coverMinioPath: track.coverMinioPath,
                stemsMetadata: track.stemsMetadata,
                addedByUserId: 'optimistic',
                addedAt: new Date().toISOString()
            };

            if (previousTracks) {
                queryClient.setQueryData<PageResponse<PlaylistTrackDto>>(
                    playlistKeys.tracks(playlistId),
                    {
                        ...previousTracks,
                        content: isPresent
                            ? previousTracks.content.filter(tr => tr.trackId !== track.id)
                            : [...previousTracks.content, optimisticTrack]
                    }
                );
            } else {
                // Initialize the cache dynamically if it was empty,
                // so the UI immediately reflects the state change before the page is ever visited.
                queryClient.setQueryData<PageResponse<PlaylistTrackDto>>(
                    playlistKeys.tracks(playlistId),
                    {
                        content: isPresent ? [] : [optimisticTrack],
                        pageable: {
                            pageNumber: 0,
                            pageSize: 50,
                            sort: {empty: true, sorted: false, unsorted: true},
                            offset: 0,
                            paged: true,
                            unpaged: false
                        },
                        totalElements: isPresent ? 0 : 1,
                        totalPages: 1,
                        last: true,
                        size: 50,
                        number: 0,
                        sort: {empty: true, sorted: false, unsorted: true},
                        numberOfElements: isPresent ? 0 : 1,
                        first: true,
                        empty: isPresent
                    } as any
                );
            }

            return {previousTracks, playlistId};
        },
        onSuccess: (_data, variables) => {
            const pName = variables.playlistName || t.playlist.common.playlist;
            if (variables.isPresent) {
                toast.success(
                    t.playlist.toasts.trackRemoved
                        .replace('{track}', variables.track.title)
                        .replace('{playlist}', `"${pName}"`)
                );
            } else {
                toast.success(
                    t.playlist.toasts.trackAdded
                        .replace('{track}', variables.track.title)
                        .replace('{playlist}', `"${pName}"`)
                );
            }
        },
        onError: (_err, _variables, context) => {
            if (context?.previousTracks && context?.playlistId) {
                queryClient.setQueryData(playlistKeys.tracks(context.playlistId), context.previousTracks);
            }
            toast.error(t.playlist.toasts.actionReverted);
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
    const {t} = useTranslation();

    return useMutation({
        mutationFn: async ({track, isLiked}: { track: TrackMetadataPayload; isLiked: boolean }) => {
            const likedPlaylist = library?.content.find(p => p.isSystem && p.name === 'Liked Tracks');
            // Примітка: це помилка для розробника, її не показуємо користувачу, тому можна залишити англійською.
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
                    artistAlias: track.artistAlias || t.playlist.common.unknownArtist,
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
                            ? previousTracks.content.filter(tr => tr.trackId !== track.id)
                            : [...previousTracks.content, optimisticTrack]
                    }
                );
            }

            return {previousTracks, likedPlaylistId: likedPlaylist.id};
        },
        onSuccess: (_data, variables) => {
            if (variables.isLiked) {
                toast.success(t.playlist.toasts.unliked.replace('{track}', variables.track.title));
            } else {
                toast.success(t.playlist.toasts.liked.replace('{track}', variables.track.title));
            }
        },
        onError: (_err, _variables, context) => {
            if (context?.previousTracks && context?.likedPlaylistId) {
                queryClient.setQueryData(playlistKeys.tracks(context.likedPlaylistId), context.previousTracks);
            }
            toast.error(t.playlist.toasts.syncFailed);
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
    const {t} = useTranslation();

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

                if (previousLibrary.some(item => item.id === playlistId)) {
                    return {previousLibrary, playlistId};
                }

                const optimisticItem: LibraryItemDto = {
                    id: playlistInfo.id,
                    type: 'FOLLOWED_PLAYLIST',
                    title: playlistInfo.name,
                    imageUrl: playlistInfo.coverMinioPath,
                    subtitle: `${t.playlist.common.playlist} • ${playlistInfo.ownerAlias}`,
                    addedAt: new Date().toISOString(),
                    ownerId: playlistInfo.ownerId,
                    isCollaborative: playlistInfo.isCollaborative,
                    isCollaborator: false
                };
                queryClient.setQueryData<LibraryItemDto[]>(libraryKeys.me(), [optimisticItem, ...previousLibrary]);
            }

            return {previousLibrary, playlistId};
        },
        onSuccess: () => {
            toast.success(t.playlist.toasts.followed);
        },
        onError: (_err, _variables, context) => {
            if (context?.previousLibrary) {
                queryClient.setQueryData(libraryKeys.me(), context.previousLibrary);
            }
            toast.error(t.playlist.toasts.followFailed);
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
    const {t} = useTranslation();

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
        onSuccess: () => {
            toast.success(t.playlist.toasts.unfollowed);
        },
        onError: (_err, _variables, context) => {
            if (context?.previousLibrary) {
                queryClient.setQueryData(libraryKeys.me(), context.previousLibrary);
            }
            toast.error(t.playlist.toasts.unfollowFailed);
        },
        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({queryKey: libraryKeys.me()});
            queryClient.invalidateQueries({queryKey: playlistKeys.detail(variables)});
        },
    });
};

// --- Collaboration State Engine ---

export const useAddCollaboratorMutation = () => {
    const queryClient = useQueryClient();
    const {t} = useTranslation();

    return useMutation({
        mutationFn: ({playlistId, targetProfile}: { playlistId: string; targetProfile: UserPublicProfileDto }) =>
            playlistApi.addCollaboratorByUsername(playlistId, targetProfile.username),
        onMutate: async ({playlistId, targetProfile}) => {
            await queryClient.cancelQueries({queryKey: playlistKeys.detail(playlistId)});

            const previousPlaylist = queryClient.getQueryData<PlaylistDto>(playlistKeys.detail(playlistId));

            if (previousPlaylist) {
                queryClient.setQueryData<PlaylistDto>(playlistKeys.detail(playlistId), {
                    ...previousPlaylist,
                    collaborators: [...(previousPlaylist.collaborators || []), targetProfile]
                });
            }

            return {previousPlaylist, playlistId};
        },
        onSuccess: (_data, variables) => {
            toast.success(t.playlist.toasts.collabAdded.replace('{user}', variables.targetProfile.alias));
        },
        onError: (_err, _variables, context) => {
            if (context?.previousPlaylist) {
                queryClient.setQueryData(playlistKeys.detail(context.playlistId), context.previousPlaylist);
            }
            toast.error(t.playlist.toasts.addCollabFailed);
        },
        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({queryKey: playlistKeys.detail(variables.playlistId)});
        }
    });
};

export const useRemoveCollaboratorMutation = () => {
    const queryClient = useQueryClient();
    const {t} = useTranslation();

    return useMutation({
        mutationFn: ({playlistId, collaboratorId}: { playlistId: string; collaboratorId: string }) =>
            playlistApi.removeCollaborator(playlistId, collaboratorId),
        onMutate: async ({playlistId, collaboratorId}) => {
            await queryClient.cancelQueries({queryKey: playlistKeys.detail(playlistId)});

            const previousPlaylist = queryClient.getQueryData<PlaylistDto>(playlistKeys.detail(playlistId));

            if (previousPlaylist) {
                queryClient.setQueryData<PlaylistDto>(playlistKeys.detail(playlistId), {
                    ...previousPlaylist,
                    collaborators: previousPlaylist.collaborators.filter(c => c.id !== collaboratorId)
                });
            }

            return {previousPlaylist, playlistId};
        },
        onSuccess: () => {
            toast.success(t.playlist.toasts.collabRemoved);
        },
        onError: (_err, _variables, context) => {
            if (context?.previousPlaylist) {
                queryClient.setQueryData(playlistKeys.detail(context.playlistId), context.previousPlaylist);
            }
            toast.error(t.playlist.toasts.removeCollabFailed);
        },
        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({queryKey: playlistKeys.detail(variables.playlistId)});
        }
    });
};