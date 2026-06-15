import React from 'react';
import {useNavigate} from 'react-router-dom';
import {Play, ListPlus, User, Link as LinkIcon, Plus, Check, Ban, XCircle} from 'lucide-react';
import toast from 'react-hot-toast';
import {useQueryClient} from '@tanstack/react-query';

import {usePlayerStore} from '@/shared/store/playerStore';
import {useAuthStore} from '@/shared/store/authStore';
import {useUserLibrary, useTogglePlaylistTrack, playlistKeys} from '../../playlist/hooks/usePlaylists';
import {useInteractionTracker} from '@/features/telemetry';
import {useNotInterestedMutation} from '@/features/recommendations/hooks/useRecommendationMutations';

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
    const {data: library, isLoading} = useUserLibrary(0, 50);
    const togglePlaylistTrack = useTogglePlaylistTrack();

    const editablePlaylists: PlaylistDto[] = library?.content || [];

    const handleToggle = (playlistId: string, isPresent: boolean) => {
        togglePlaylistTrack.mutate({
            playlistId,
            track: {...track, coverMinioPath: track.coverMinioPath ?? null} as any,
            isPresent
        });

        if (!isPresent) {
            const currentContext = usePlayerStore.getState().playbackContext;
            trackInteraction(track.id, 'ADD_TO_PLAYLIST', currentContext?.type || 'PUBLIC_FEED', 'CONTEXT_MENU');
        }
    };

    return (
        <ContextMenuSub>
            <ContextMenuSubTrigger>
                <Plus className="mr-2 h-4 w-4"/>
                <span>{track.artistUsername === 'unavailable' ? 'Exclude from Playlist' : 'Add to Playlist'}</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56 max-h-64 overflow-y-auto">
                {isLoading ? (
                    <ContextMenuItem disabled>Loading...</ContextMenuItem>
                ) : editablePlaylists.length === 0 ? (
                    <ContextMenuItem disabled>No editable playlists</ContextMenuItem>
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
                                onClick={() => handleToggle(playlist.id, isPresent)}
                                className="flex items-center justify-between group"
                            >
                                <span className="truncate pr-2">{playlist.name}</span>
                                {isPresent && <Check className="h-4 w-4 text-violet-400 shrink-0"/>}
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

    const isUnavailable = track.artistUsername === 'unavailable';
    const isOwner = currentUser?.id === track.artistId;

    const handleCopyLink = () => {
        const url = `${window.location.origin}/track/${track.id}`;
        navigator.clipboard.writeText(url).then(() => {
            toast.success('Link copied to clipboard');
            const currentContext = usePlayerStore.getState().playbackContext;
            trackInteraction(track.id, 'SHARE', currentContext?.type || 'PUBLIC_FEED', 'CONTEXT_MENU');
        });
    };

    const handleNotInterested = () => {
        markNotInterested(track.id);
        toast.success("We'll tune your recommendations", {icon: '🤫'});
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
                            <Ban className="mr-2 h-4 w-4"/>
                            <span>Content Unavailable</span>
                        </ContextMenuItem>
                        <AddToPlaylistSubMenu track={track}/>
                    </>
                ) : (
                    <>
                        <ContextMenuItem onClick={() => setTrack(track)}>
                            <Play className="mr-2 h-4 w-4"/>
                            <span>Play Now</span>
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => {
                            addToQueue(track);
                            toast.success('Added to queue');
                        }}>
                            <ListPlus className="mr-2 h-4 w-4"/>
                            <span>Add to Queue</span>
                        </ContextMenuItem>

                        <ContextMenuSeparator/>
                        <AddToPlaylistSubMenu track={track}/>
                        <ContextMenuSeparator/>

                        <ContextMenuItem onClick={() => navigate(`/user/${track.artistUsername}`)}>
                            <User className="mr-2 h-4 w-4"/>
                            <span>Go to Artist</span>
                        </ContextMenuItem>
                        <ContextMenuItem onClick={handleCopyLink}>
                            <LinkIcon className="mr-2 h-4 w-4"/>
                            <span>Copy Link</span>
                        </ContextMenuItem>

                        {/* Recommendation Math Interaction: Hidden from track owners */}
                        {!isOwner && (
                            <>
                                <ContextMenuSeparator/>
                                <ContextMenuItem
                                    onClick={handleNotInterested}
                                    className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 focus:text-red-400 focus:bg-red-400/10 transition-colors"
                                >
                                    <XCircle className="mr-2 h-4 w-4"/>
                                    <span>Not Interested</span>
                                </ContextMenuItem>
                            </>
                        )}
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
};