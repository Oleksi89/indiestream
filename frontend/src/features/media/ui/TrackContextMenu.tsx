import React, {useMemo, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {Play, ListPlus, User, Link as LinkIcon, Plus, Check, Ban, XCircle} from 'lucide-react';
import toast from 'react-hot-toast';
import {useQueryClient} from '@tanstack/react-query';

import {usePlayerStore} from '@/shared/store/playerStore';
import {useAuthStore} from '@/shared/store/authStore';
import {useUserLibrary, useTogglePlaylistTrack, playlistKeys, useToggleLike} from '../../playlist/hooks/usePlaylists';
import {playlistApi} from '@/features/playlist/api/playlist.api';
import {useInteractionTracker} from '@/features/telemetry';
import {useNotInterestedMutation} from '@/features/recommendations/hooks/useRecommendationMutations';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent
} from '@/shared/ui/ContextMenu';
import type {PageResponse, TrackDto} from "@/features/media/types";
import type {PlaylistTrackDto, PlaylistDto} from "@/features/playlist/types";

interface TrackContextMenuProps {
    children: React.ReactNode;
    track: TrackDto;
    onRemoveFromPlaylist?: () => void;
}

/**
 * SubMenu component strictly handling Playlist Toggle logic.
 * Enforces SOLID Single Responsibility Principle.
 */
const AddToPlaylistSubMenu = ({track}: { track: TrackDto }) => {
    const queryClient = useQueryClient();
    const {trackInteraction} = useInteractionTracker();
    const {t} = useTranslation();
    const currentUser = useAuthStore((s) => s.user);
    const {data: library, isLoading} = useUserLibrary(0, 50);
    const togglePlaylistTrack = useTogglePlaylistTrack();
    const toggleLike = useToggleLike();

    // Only show playlists the user actually has permission to modify
    const editablePlaylists: PlaylistDto[] = useMemo(() => {
        if (!library?.content) return [];
        return library.content.filter(p =>
            p.ownerId === currentUser?.id ||
            (p.isCollaborative && p.collaborators?.some(c => c.id === currentUser?.id))
        );
    }, [library?.content, currentUser?.id]);

    /**
     * PREFETCHING:
     * Hydrates the React Query cache in the background for editable playlists.
     * Guarantees the `isPresent` checkmark is accurate instantly without requiring the user to visit the playlist page.
     */
    useEffect(() => {
        if (!editablePlaylists.length) return;
        editablePlaylists.forEach(p => {
            queryClient.prefetchQuery({
                queryKey: playlistKeys.tracks(p.id),
                queryFn: () => playlistApi.getPlaylistTracks(p.id, 0, 50),
                staleTime: 1000 * 60 * 5,
            });
        });
    }, [editablePlaylists, queryClient]);

    const handleToggle = (playlist: PlaylistDto, isPresent: boolean) => {
        const isSystemLiked = playlist.isSystem && playlist.name === 'Liked Tracks';

        if (isSystemLiked) {
            toggleLike.mutate({
                track: {...track, coverMinioPath: track.coverMinioPath ?? null} as any,
                isLiked: isPresent
            });
        } else {
            togglePlaylistTrack.mutate({
                playlistId: playlist.id,
                track: {...track, coverMinioPath: track.coverMinioPath ?? null} as any,
                isPresent,
                playlistName: playlist.name
            });
        }

        if (!isPresent) {
            const currentContext = usePlayerStore.getState().playbackContext;
            const interactionType = isSystemLiked ? 'LIKE' : 'ADD_TO_PLAYLIST';
            trackInteraction(track.id, interactionType, currentContext?.type || 'PUBLIC_FEED', 'CONTEXT_MENU');
        }
    };

    const subMenuLabel = track.artistUsername === 'unavailable'
        ? t.media.contextMenu.excludeFromPlaylist
        : t.media.contextMenu.addToPlaylist;

    return (
        <ContextMenuSub>
            <ContextMenuSubTrigger>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true"/>
                <span>{subMenuLabel}</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56 max-h-64 overflow-y-auto">
                {isLoading ? (
                    <ContextMenuItem disabled>{t.media.contextMenu.loading}</ContextMenuItem>
                ) : editablePlaylists.length === 0 ? (
                    <ContextMenuItem disabled>{t.media.contextMenu.noEditablePlaylists}</ContextMenuItem>
                ) : (
                    editablePlaylists.map((playlist) => {
                        const tracks = queryClient.getQueryData<PageResponse<PlaylistTrackDto>>(playlistKeys.tracks(playlist.id));
                        const isPresent = tracks?.content.some(t => t.trackId === track.id) || false;

                        // If track is unavailable, only show playlists it is already in (to allow removal)
                        if (track.artistUsername === 'unavailable' && !isPresent) return null;

                        return (
                            <ContextMenuItem
                                key={playlist.id}
                                onSelect={(e) => e.preventDefault()}
                                onClick={() => handleToggle(playlist, isPresent)}
                                className="flex items-center justify-between group"
                            >
                                <span className="truncate pr-2">{playlist.name}</span>
                                {isPresent && <Check className="h-4 w-4 text-violet-400 shrink-0" aria-hidden="true"/>}
                            </ContextMenuItem>
                        );
                    })
                )}
            </ContextMenuSubContent>
        </ContextMenuSub>
    );
};

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({children, track}) => {
    const navigate = useNavigate();
    const currentUser = useAuthStore((s) => s.user);
    const setTrack = usePlayerStore((state) => state.setTrack);
    const addToQueue = usePlayerStore((state) => state.addToQueue);
    const {trackInteraction} = useInteractionTracker();
    const {mutate: markNotInterested} = useNotInterestedMutation();
    const {t} = useTranslation();

    const isUnavailable = track.artistUsername === 'unavailable';
    const isOwner = currentUser?.id === track.artistId;

    const handleCopyLink = () => {
        const url = `${window.location.origin}/track/${track.id}`;
        navigator.clipboard.writeText(url).then(() => {
            toast.success(t.media.contextMenu.toastLinkCopied);
            const currentContext = usePlayerStore.getState().playbackContext;
            trackInteraction(track.id, 'SHARE', currentContext?.type || 'PUBLIC_FEED', 'CONTEXT_MENU');
        });
    };

    const handleNotInterested = () => {
        markNotInterested(track.id);
        toast.success(t.media.contextMenu.toastNotInterested, {icon: '🤫'});
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div>{children}</div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
                {isUnavailable ? (
                    <>
                        <ContextMenuItem disabled className="text-red-400/70">
                            <Ban className="mr-2 h-4 w-4" aria-hidden="true"/>
                            <span>{t.media.contextMenu.contentUnavailable}</span>
                        </ContextMenuItem>
                        <AddToPlaylistSubMenu track={track}/>
                    </>
                ) : (
                    <>
                        <ContextMenuItem onClick={() => setTrack(track)}>
                            <Play className="mr-2 h-4 w-4" aria-hidden="true"/>
                            <span>{t.media.contextMenu.playNow}</span>
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => {
                            addToQueue(track);
                            toast.success(t.media.contextMenu.toastAddedToQueue);
                        }}>
                            <ListPlus className="mr-2 h-4 w-4" aria-hidden="true"/>
                            <span>{t.media.contextMenu.addToQueue}</span>
                        </ContextMenuItem>

                        <ContextMenuSeparator/>
                        <AddToPlaylistSubMenu track={track}/>
                        <ContextMenuSeparator/>

                        <ContextMenuItem onClick={() => navigate(`/user/${track.artistUsername}`)}>
                            <User className="mr-2 h-4 w-4" aria-hidden="true"/>
                            <span>{t.media.contextMenu.goToArtist}</span>
                        </ContextMenuItem>
                        <ContextMenuItem onClick={handleCopyLink}>
                            <LinkIcon className="mr-2 h-4 w-4" aria-hidden="true"/>
                            <span>{t.media.contextMenu.copyLink}</span>
                        </ContextMenuItem>

                        {/* Recommendation Math Interaction: Hidden from track owners */}
                        {!isOwner && (
                            <>
                                <ContextMenuSeparator/>
                                <ContextMenuItem
                                    onClick={handleNotInterested}
                                    className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 focus:text-red-400 focus:bg-red-400/10 transition-colors"
                                >
                                    <XCircle className="mr-2 h-4 w-4" aria-hidden="true"/>
                                    <span>{t.media.contextMenu.notInterested}</span>
                                </ContextMenuItem>
                            </>
                        )}
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
};