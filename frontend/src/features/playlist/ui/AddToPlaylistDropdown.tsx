import React from 'react';
import {Check, Plus, Heart} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {playlistKeys, useUserLibrary, useTogglePlaylistTrack} from '../hooks/usePlaylists';
import type {TrackMetadataPayload, PlaylistTrackDto} from "../types";
import type {PageResponse} from "@/features/media/types";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator
} from "@/shared/ui/DropdownMenu";

interface AddToPlaylistDropdownProps {
    track: TrackMetadataPayload;
    children: React.ReactNode;
}

export const AddToPlaylistDropdown = ({track, children}: AddToPlaylistDropdownProps) => {
    const {data: library} = useUserLibrary();
    const queryClient = useQueryClient();
    const toggleTrack = useTogglePlaylistTrack();

    const playlists = library?.content || [];

    const handleToggleTrack = (playlistId: string, isPresent: boolean) => {
        toggleTrack.mutate({playlistId, track, isPresent});
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {children}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" sideOffset={8}>
                <div className="px-2 py-1.5 mb-1">
                    <span
                        className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Add to Playlist</span>
                </div>
                <DropdownMenuSeparator/>
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {playlists.map(playlist => {
                        const tracks = queryClient.getQueryData<PageResponse<PlaylistTrackDto>>(playlistKeys.tracks(playlist.id));
                        const isPresent = tracks?.content.some(t => t.trackId === track.id) || false;
                        const isLiked = playlist.isSystem && playlist.name === 'Liked Tracks';

                        return (
                            <DropdownMenuItem
                                key={playlist.id}
                                onSelect={(e) => e.preventDefault()} // Keeps open for visual feedback
                                onClick={() => handleToggleTrack(playlist.id, isPresent)}
                                className="flex items-center justify-between py-2 group cursor-pointer"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {isLiked ? (
                                        <Heart size={14} className="text-violet-400 fill-current"/>
                                    ) : (
                                        <Plus size={14}
                                              className="text-slate-500 group-hover:text-violet-400 transition-colors"/>
                                    )}
                                    <span className="truncate font-medium">{playlist.name}</span>
                                </div>
                                {isPresent && <Check size={16} className="text-violet-400 shrink-0"/>}
                            </DropdownMenuItem>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

