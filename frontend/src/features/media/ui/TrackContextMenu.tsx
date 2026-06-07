import React from 'react';
import {useNavigate} from 'react-router-dom';
import {Play, ListPlus, User, Link as LinkIcon, Plus, Check, Ban} from 'lucide-react';
import toast from 'react-hot-toast';
import {useQueryClient} from '@tanstack/react-query';

import {usePlayerStore} from '@/shared/store/playerStore.ts';
import {useUserLibrary, useTogglePlaylistTrack, playlistKeys} from '../../playlist/hooks/usePlaylists';


import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent
} from '@/shared/ui/ContextMenu.tsx';
import type {PageResponse, TrackDto} from "@/features/media/types";
import type {PlaylistTrackDto} from "@/features/playlist/types";
import {ContextMenuLabel} from "@radix-ui/react-context-menu";

interface TrackContextMenuProps {
    children: React.ReactNode;
    track: TrackDto;
    onRemoveFromPlaylist?: () => void;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({children, track}) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const setTrack = usePlayerStore((state) => state.setTrack);
    const addToQueue = usePlayerStore((state) => state.addToQueue);

    const {data: library, isLoading: isLibraryLoading} = useUserLibrary(0, 50);
    const togglePlaylistTrack = useTogglePlaylistTrack();
    const isUnavailable = track.artistUsername === 'unavailable';

    const handlePlay = () => setTrack(track);

    const handleAddToQueue = () => {
        addToQueue(track);
        toast.success('Added to queue');
    };

    const handleGoToArtist = () => navigate(`/artist/${track.artistId}`);

    const handleCopyLink = () => {
        const url = `${window.location.origin}/track/${track.id}`;
        navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard'));
    };

    const handleTogglePlaylist = (playlistId: string, isPresent: boolean) => {
        const payload = {
            id: track.id,
            title: track.title,
            artistId: track.artistId,
            artistAlias: track.artistAlias,
            artistUsername: track.artistUsername,
            coverMinioPath: track.coverMinioPath ?? null,
            stemsMetadata: track.stemsMetadata,
            durationSeconds: track.durationSeconds
        };

        togglePlaylistTrack.mutate({
            playlistId,
            track: payload,
            isPresent
        });
    };

    const editablePlaylists = library?.content || [];

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
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <Plus className="mr-2 h-4 w-4"/>
                                <span>Exclude from Playlist</span>
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-56 max-h-64 overflow-y-auto">
                                {isLibraryLoading ? (
                                    <ContextMenuItem disabled>Loading...</ContextMenuItem>
                                ) : editablePlaylists.length === 0 ? (
                                    <ContextMenuItem disabled>No editable playlists</ContextMenuItem>
                                ) : (
                                    editablePlaylists.map((playlist) => {
                                        // Dynamically check cache for track presence
                                        const tracks = queryClient.getQueryData<PageResponse<PlaylistTrackDto>>(playlistKeys.tracks(playlist.id));
                                        const isPresent = tracks?.content.some(t => t.trackId === track.id) || false;

                                        if (isPresent) return (

                                            <ContextMenuItem
                                                key={playlist.id}
                                                onSelect={(e) => e.preventDefault()} // Prevent closing
                                                onClick={() => handleTogglePlaylist(playlist.id, isPresent)}
                                                className="flex items-center justify-between group"
                                            >
                                                {isPresent &&
                                                    <>
                                                        <span className="truncate pr-2">{playlist.name}</span>
                                                        <Check className="h-4 w-4 text-violet-400 shrink-0"/>
                                                    </>}
                                            </ContextMenuItem>
                                        );
                                    })
                                )}
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                    </>
                ) : (
                    <>

                        <ContextMenuItem onClick={handlePlay}>
                            <Play className="mr-2 h-4 w-4"/>
                            <span>Play Now</span>
                        </ContextMenuItem>
                        <ContextMenuItem onClick={handleAddToQueue}>
                            <ListPlus className="mr-2 h-4 w-4"/>
                            <span>Add to Queue</span>
                        </ContextMenuItem>
                        <ContextMenuSeparator/>

                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <Plus className="mr-2 h-4 w-4"/>
                                <span>Add to Playlist</span>
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-56 max-h-64 overflow-y-auto">
                                {isLibraryLoading ? (
                                    <ContextMenuItem disabled>Loading...</ContextMenuItem>
                                ) : editablePlaylists.length === 0 ? (
                                    <ContextMenuItem disabled>No editable playlists</ContextMenuItem>
                                ) : (
                                    editablePlaylists.map((playlist) => {
                                        // Dynamically check cache for track presence
                                        const tracks = queryClient.getQueryData<PageResponse<PlaylistTrackDto>>(playlistKeys.tracks(playlist.id));
                                        const isPresent = tracks?.content.some(t => t.trackId === track.id) || false;

                                        return (
                                            <ContextMenuItem
                                                key={playlist.id}
                                                onSelect={(e) => e.preventDefault()} // Prevent closing
                                                onClick={() => handleTogglePlaylist(playlist.id, isPresent)}
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

                        <ContextMenuSeparator/>
                        <ContextMenuItem onClick={handleGoToArtist}>
                            <User className="mr-2 h-4 w-4"/>
                            <span>Go to Artist</span>
                        </ContextMenuItem>
                        <ContextMenuItem onClick={handleCopyLink}>
                            <LinkIcon className="mr-2 h-4 w-4"/>
                            <span>Copy Link</span>
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
};