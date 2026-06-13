import {useMemo, useState} from 'react';
import {useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {playlistApi} from '@/features/playlist/api/playlist.api';
import {playlistKeys, useFollowPlaylist, useUnfollowPlaylist} from '@/features/playlist/hooks/usePlaylists';
import {usePlaylistPermissions} from '@/features/playlist/hooks/usePlaylistPermissions';
import {useLibrary} from '@/features/library/hooks/useLibrary';
import {usePlayerStore} from '@/shared/store/playerStore';
import {useAuthStore} from '@/shared/store/authStore';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {usePlaylistColor} from '@/features/playlist/hooks/usePlaylistColor';
import {useInteractionTracker} from "@/features/telemetry";

import {EditPlaylistModal} from "@/features/playlist/ui/EditPlaylistModal";
import {CollaboratorsModal} from "@/features/playlist/ui/CollaboratorsModal";
import {PlaylistAnalyticsModal} from "@/features/playlist/ui/PlaylistAnalyticsModal.tsx";
import {PlaylistHeader} from '@/features/playlist/ui/PlaylistHeader';
import {PlaylistActionBar} from '@/features/playlist/ui/PlaylistActionBar.tsx';
import {PlaylistTrackList} from '@/features/playlist/ui/PlaylistTrackList.tsx';

import type {TrackDto} from "@/features/media/types";

export const PlaylistPage = () => {
    const {id} = useParams<{ id: string }>();
    const {playContext} = usePlayerStore();
    const {user: currentUser} = useAuthStore();
    const {data: library} = useLibrary();
    const {trackInteraction} = useInteractionTracker();

    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isCollabModalOpen, setCollabModalOpen] = useState(false);
    const [isAnalyticsModalOpen, setAnalyticsModalOpen] = useState(false);

    const {data: playlist, isLoading: isPlaylistLoading} = useQuery({
        queryKey: playlistKeys.detail(id!),
        queryFn: () => playlistApi.getPlaylist(id!),
        enabled: !!id
    });

    const {data: tracksData, isLoading: isTracksLoading} = useQuery({
        queryKey: [...playlistKeys.all, 'tracks', id],
        queryFn: () => playlistApi.getPlaylistTracks(id!),
        enabled: !!id
    });

    const {url: coverUrl} = useSecureUrl(`playlist-cover-${id}`, () => playlistApi.getPlaylistCoverBlob(id!), !!playlist?.coverMinioPath && !!id);
    const dominantColor = usePlaylistColor(coverUrl);

    const followMutation = useFollowPlaylist();
    const unfollowMutation = useUnfollowPlaylist();

    const mappedTracks: TrackDto[] = useMemo(() => {
        if (!tracksData?.content) return [];
        return tracksData.content.map(track => ({
            id: track.trackId,
            title: track.title,
            artistId: track.artistId,
            artistUsername: track.artistUsername,
            artistAlias: track.artistAlias,
            durationSeconds: track.durationSeconds,
            coverMinioPath: track.coverMinioPath,
            stemsMetadata: track.stemsMetadata,
            minioBucketPath: '',
            status: track.artistUsername === 'unavailable' ? 'BANNED' : 'READY',
            genre: track.genre,
            isExplicit: track.isExplicit ?? false,
            tags: track.tags ?? {custom: [], moods: [], aiGenerated: []}
        }));
    }, [tracksData]);

    const {isOwner, isCollaborator, canEditMetadata} = usePlaylistPermissions(playlist, currentUser?.id);
    const isFollowed = library?.some(item => item.id === playlist?.id && item.type === 'FOLLOWED_PLAYLIST') || false;

    if (isPlaylistLoading) return <div className="p-8 animate-pulse text-slate-500">Loading playlist...</div>;
    if (!playlist) return <div className="p-8 text-center text-slate-400">Playlist not found</div>;

    const playableTracks = mappedTracks.filter(t => t.artistUsername !== 'unavailable');

    const handlePlayPlaylist = () => {
        if (playableTracks.length > 0) playContext(playableTracks, {type: 'PLAYLIST', id: playlist.id}, 0);
    };

    const handlePlayTrack = (index: number) => {
        playContext(playableTracks, {type: 'PLAYLIST', id: playlist.id}, index);
    };

    const handleToggleFollow = () => {
        if (isFollowed) unfollowMutation.mutate(playlist.id);
        else {
            followMutation.mutate(playlist.id);
            trackInteraction(playlist.id, 'FOLLOW_PLAYLIST', 'PLAYLIST', 'TRACK_CARD');
        }
    };

    return (
        <div className="flex flex-col min-h-full transition-colors duration-1000 ease-in-out"
             style={{background: `linear-gradient(to bottom, ${dominantColor} 0%, #121212 400px)`}}>
            <PlaylistHeader playlist={playlist} coverUrl={coverUrl} canEditMetadata={canEditMetadata}
                            onEditClick={() => setEditModalOpen(true)} onCollabClick={() => setCollabModalOpen(true)}/>

            <PlaylistActionBar
                playlist={playlist} isOwner={isOwner} isCollaborator={isCollaborator} isFollowed={isFollowed}
                onPlayPlaylist={handlePlayPlaylist} onToggleFollow={handleToggleFollow}
                onOpenCollab={() => setCollabModalOpen(true)} onOpenAnalytics={() => setAnalyticsModalOpen(true)}
            />

            <PlaylistTrackList
                playlistId={playlist.id} tracks={mappedTracks} rawTracksData={tracksData}
                isLoading={isTracksLoading} onPlayTrack={handlePlayTrack}
            />

            {canEditMetadata && <EditPlaylistModal playlist={playlist} isOpen={isEditModalOpen}
                                                   onClose={() => setEditModalOpen(false)}/>}
            {playlist.isCollaborative && currentUser?.id &&
                <CollaboratorsModal playlist={playlist} currentUserId={currentUser?.id} isOpen={isCollabModalOpen}
                                    onClose={() => setCollabModalOpen(false)}/>}
            {isOwner && <PlaylistAnalyticsModal playlist={playlist} isOpen={isAnalyticsModalOpen}
                                                onClose={() => setAnalyticsModalOpen(false)}/>}
        </div>
    );
};