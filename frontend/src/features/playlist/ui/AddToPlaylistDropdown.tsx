import React, {useMemo, useEffect} from 'react';
import {Check, Plus, Heart} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {playlistKeys, useUserLibrary, useTogglePlaylistTrack, useToggleLike} from '../hooks/usePlaylists';
import {playlistApi} from '@/features/playlist/api/playlist.api';
import {useAuthStore} from '@/shared/store/authStore';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import type {TrackMetadataPayload, PlaylistTrackDto} from "../types";
import type {PageResponse} from "@/features/media/types";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator
} from "@/shared/ui/DropdownMenu";
import {useInteractionTracker} from "@/features/telemetry";
import {usePlayerStore} from "@/shared/store/playerStore.ts";

interface AddToPlaylistDropdownProps {
    track: TrackMetadataPayload;
    children: React.ReactNode;
}

export const AddToPlaylistDropdown = ({track, children}: AddToPlaylistDropdownProps) => {
    const {t} = useTranslation();
    const {data: library} = useUserLibrary();
    const queryClient = useQueryClient();
    const toggleTrack = useTogglePlaylistTrack();
    const toggleLike = useToggleLike();
    const currentUser = useAuthStore(s => s.user);
    const {trackInteraction} = useInteractionTracker();

    // Exclude read-only public playlists
    const editablePlaylists = useMemo(() => {
        if (!library?.content) return [];
        return library.content.filter(p =>
            p.ownerId === currentUser?.id ||
            (p.isCollaborative && p.collaborators?.some(c => c.id === currentUser?.id))
        );
    }, [library?.content, currentUser?.id]);

    // PREFETCHING STRATEGY
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

    const handleToggleTrack = (playlist: any, isPresent: boolean) => {
        const isSystemLiked = playlist.isSystem && playlist.name === 'Liked Tracks';

        if (isSystemLiked) {
            toggleLike.mutate({track, isLiked: isPresent});
        } else {
            toggleTrack.mutate({
                playlistId: playlist.id,
                track,
                isPresent,
                playlistName: playlist.name
            });
        }

        if (!isPresent) {
            const currentContext = usePlayerStore.getState().playbackContext;
            const interactionType = isSystemLiked ? 'LIKE' : 'ADD_TO_PLAYLIST';
            trackInteraction(track.id, interactionType, currentContext?.type || 'PUBLIC_FEED', 'DROPDOWN_MENU');
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {children}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" sideOffset={8}>
                <div className="px-2 py-1.5 mb-1">
                    <span
                        className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.playlist.menu.heading}</span>
                </div>
                <DropdownMenuSeparator/>
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {editablePlaylists.map(playlist => {
                        const tracks = queryClient.getQueryData<PageResponse<PlaylistTrackDto>>(playlistKeys.tracks(playlist.id));
                        const isPresent = tracks?.content.some(pt => pt.trackId === track.id) || false;
                        const isLiked = playlist.isSystem && playlist.name === 'Liked Tracks';

                        return (
                            <DropdownMenuItem
                                key={playlist.id}
                                onSelect={(e) => e.preventDefault()} // Keeps open for visual feedback
                                onClick={() => handleToggleTrack(playlist, isPresent)}
                                className="flex items-center justify-between py-2 group cursor-pointer"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {isLiked ? (
                                        <Heart size={14} className="text-violet-400 fill-current" aria-hidden="true"/>
                                    ) : (
                                        <Plus size={14} aria-hidden="true"
                                              className="text-slate-500 group-hover:text-violet-400 transition-colors"/>
                                    )}
                                    <span className="truncate font-medium">{playlist.name}</span>
                                </div>
                                {isPresent &&
                                    <Check size={16} className="text-violet-400 shrink-0" aria-hidden="true"/>}
                            </DropdownMenuItem>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};