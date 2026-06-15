import React from 'react';
import {usePlayerStore} from '@/shared/store/playerStore';
import {useAuthStore} from '@/shared/store/authStore';
import {mediaApi} from '@/features/media/api/media.api';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {useQuery} from '@tanstack/react-query';
import {playlistApi} from '@/features/playlist/api/playlist.api';
import {useToggleLike, useUserLibrary} from '@/features/playlist/hooks/usePlaylists';
import {useInteractionTracker} from '@/features/telemetry';
import {useNotInterestedMutation} from '@/features/recommendations/hooks/useRecommendationMutations';
import {AddToPlaylistDropdown} from '@/features/playlist/ui/AddToPlaylistDropdown';
import {Disc3, Loader2, Heart, PlusCircle, XCircle, MoreVertical} from 'lucide-react';
import {cn} from '@/shared/lib/utils';
import type {TrackMetadataPayload} from '@/features/playlist/types';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/shared/ui/DropdownMenu.tsx";

interface PlayerTrackInfoProps {
    isStemsLoading: boolean;
}

/**
 * Extracted Presentation & Logic Component for the Track Information segment of the Player.
 * Enforces Single Responsibility Principle (SRP).
 */
export const PlayerTrackInfo: React.FC<PlayerTrackInfoProps> = ({isStemsLoading}) => {
    const {currentTrack, playbackMode, playbackContext, playNext} = usePlayerStore();
    const currentUser = useAuthStore(state => state.user);

    const {trackInteraction} = useInteractionTracker();
    const {mutate: markNotInterested} = useNotInterestedMutation();
    const toggleLike = useToggleLike();
    const {data: library} = useUserLibrary();

    const trackId = currentTrack?.id;

    // Secure Cover Fetching
    const {url: coverUrl} = useSecureUrl(
        `cover-player-${trackId || 'idle'}`,
        () => trackId ? mediaApi.getTrackCoverBlob(trackId) : Promise.reject('No track loaded'),
        !!currentTrack?.coverMinioPath && !!trackId
    );

    // Like State Resolution
    const likedPlaylistId = library?.content.find(p => p.isSystem && p.name === 'Liked Tracks')?.id;
    const {data: likedTracksData} = useQuery({
        queryKey: ['playlists', 'tracks', likedPlaylistId],
        queryFn: () => playlistApi.getPlaylistTracks(likedPlaylistId as string),
        enabled: !!likedPlaylistId && !!trackId,
    });

    const isLiked = !!trackId && (likedTracksData?.content.some(pt => pt.trackId === trackId) || false);

    if (!currentTrack || !trackId) return null;

    const trackMetadata: TrackMetadataPayload = {
        id: currentTrack.id,
        title: currentTrack.title,
        artistId: currentTrack.artistId,
        artistUsername: currentTrack.artistUsername,
        artistAlias: currentTrack.artistAlias,
        durationSeconds: currentTrack.durationSeconds || 0,
        stemsMetadata: currentTrack.stemsMetadata,
        coverMinioPath: currentTrack.coverMinioPath || null
    };

    const handleLike = () => {
        toggleLike.mutate({track: trackMetadata, isLiked});
        if (!isLiked) {
            trackInteraction(trackId, 'LIKE', playbackContext?.type || 'PUBLIC_FEED', 'PLAYER_BAR');
        }
    };

    const handleNotInterested = () => {
        markNotInterested(trackId);
        playNext(); // Instantly skip the track the user disliked
    };

    const isOwner = currentUser?.id === currentTrack.artistId;

    return (
        <div className="flex items-center gap-4 w-[25%] min-w-[250px]">
            <div
                className="relative h-14 w-14 rounded-lg bg-slate-800 overflow-hidden border border-slate-700 shrink-0">
                {coverUrl ? (
                    <img src={coverUrl} alt={currentTrack.title} className="h-full w-full object-cover"/>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Disc3 className="text-slate-600"/>
                    </div>
                )}
                {isStemsLoading && (
                    <div
                        className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[2px]">
                        <Loader2 className="text-violet-400 animate-spin" size={20}/>
                    </div>
                )}
            </div>

            <div className="flex flex-col truncate pr-2">
                <span className="text-white font-semibold truncate">{currentTrack.title}</span>
                <span className={cn(
                    "text-[10px] uppercase tracking-wider font-bold truncate mt-0.5",
                    playbackMode === 'stems' ? "text-violet-400" : "text-slate-500"
                )}>
                    {isStemsLoading ? 'Syncing Stems...' : playbackMode === 'stems' ? 'Multi-Stem Mode' : 'Master Track'}
                </span>
            </div>

            {/* Action Buttons Container */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                    onClick={handleLike}
                    disabled={toggleLike.isPending}
                    className={cn("p-2 rounded-full transition-colors", isLiked ? "text-violet-400" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                    title={isLiked ? "Unlike" : "Like"}
                >
                    <Heart size={18} className={cn(isLiked && "fill-current", toggleLike.isPending && "opacity-50")}/>
                </button>

                <AddToPlaylistDropdown track={trackMetadata}>
                    <button
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors outline-none focus:bg-slate-800"
                        title="Add to Playlist">
                        <PlusCircle size={18}/>
                    </button>
                </AddToPlaylistDropdown>

                {/* Isolated Sub-Menu Dropdown for Recommendation Governance */}
                {!isOwner && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors outline-none focus:bg-slate-800"
                                title="More Options">
                                <MoreVertical size={18}/>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-48 bg-slate-900 border border-slate-800 text-slate-200 shadow-2xl">
                            <DropdownMenuItem
                                onClick={handleNotInterested}
                                className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 focus:text-red-400 focus:bg-red-400/10 transition-colors cursor-pointer font-medium text-xs py-2"
                            >
                                <XCircle className="mr-2 h-4 w-4 text-slate-500 group-hover:text-red-400"/>
                                <span>Not Interested</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
};