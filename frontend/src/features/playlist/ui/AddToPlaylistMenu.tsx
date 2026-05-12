import {Check, Heart, Plus} from 'lucide-react';
import {playlistKeys, useUserLibrary, useTogglePlaylistTrack} from '../hooks/usePlaylists';
import {useQueryClient} from '@tanstack/react-query';
import type {PlaylistDto, PlaylistTrackDto, TrackMetadataPayload} from "@/features/playlist/types";
import type {PageResponse} from "@/features/media/types";

interface AddToPlaylistMenuProps {
    track: TrackMetadataPayload;
    position: { x: number; y: number };
    onClose: () => void;
}

export const AddToPlaylistMenu = ({track, position}: AddToPlaylistMenuProps) => {
    const {data: library} = useUserLibrary();
    const queryClient = useQueryClient();
    const toggleTrack = useTogglePlaylistTrack();

    const playlists = library?.content || [];

    const handleToggleTrack = (playlist: PlaylistDto) => {
        const tracks = queryClient.getQueryData<PageResponse<PlaylistTrackDto>>(playlistKeys.tracks(playlist.id));
        const isPresent = tracks?.content.some(t => t.trackId === track.id) || false;

        toggleTrack.mutate({playlistId: playlist.id, track, isPresent});
    };

    return (
        <div
            className="fixed z-[100] w-64 bg-slate-900 border border-slate-700/50 rounded-lg shadow-2xl p-1 animate-in fade-in zoom-in-95"
            style={{bottom: window.innerHeight - position.y + 10, left: position.x}}
            onClick={e => e.stopPropagation()}
        >
            <div className="px-3 py-2 border-b border-slate-800/60 mb-1 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Add to Playlist</span>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {playlists.map(playlist => {
                    const tracks = queryClient.getQueryData<PageResponse<PlaylistTrackDto>>(playlistKeys.tracks(playlist.id));
                    const isPresent = tracks?.content.some(t => t.trackId === track.id);
                    const isLiked = playlist.isSystem && playlist.name === 'Liked Tracks';

                    return (
                        <button
                            key={playlist.id}
                            onClick={() => handleToggleTrack(playlist)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-200 hover:bg-indigo-600/20 hover:text-white rounded-md transition-all group"
                        >
                            <div className="flex items-center gap-2 truncate">
                                {isLiked ? <Heart size={14} className="text-indigo-400 fill-current"/> :
                                    <Plus size={14} className="text-slate-500 group-hover:text-indigo-400"/>}
                                <span className="truncate font-medium">{playlist.name}</span>
                            </div>
                            {isPresent && <Check size={16} className="text-indigo-400 shrink-0"/>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};