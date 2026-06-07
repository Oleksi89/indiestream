import {useMemo, useState} from 'react';
import {useParams} from 'react-router-dom';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {playlistApi} from '@/features/playlist/api/playlist.api';
import {
    playlistKeys,
    useFollowPlaylist,
    useUnfollowPlaylist,
    useTogglePlaylistTrack
} from '@/features/playlist/hooks/usePlaylists';
import {usePlaylistPermissions} from '@/features/playlist/hooks/usePlaylistPermissions';
import {useLibrary} from '@/features/library/hooks/useLibrary';
import {Clock, Play, MoreHorizontal, Disc3, Check, Users} from 'lucide-react';
import {Button} from '@/shared/ui/button';
import {cn} from '@/shared/lib/utils';
import {TrackContextMenu} from '@/features/media/ui/TrackContextMenu';
import {usePlayerStore} from '@/shared/store/playerStore';
import {useAuthStore} from '@/shared/store/authStore';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {TrackCard} from "@/features/media/ui/TrackCard";
import {EditPlaylistModal} from "@/features/playlist/ui/EditPlaylistModal";
import {CollaboratorsModal} from "@/features/playlist/ui/CollaboratorsModal";
import {PlaylistDropdownMenu} from "@/features/playlist/ui/PlaylistDropdownMenu";
import {PlaylistHeader} from '@/features/playlist/ui/PlaylistHeader';
import {usePlaylistColor} from '@/features/playlist/hooks/usePlaylistColor';
import type {TrackDto} from "@/features/media/types";

export const PlaylistPage = () => {
    const {id} = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const {playContext} = usePlayerStore();
    const {user: currentUser} = useAuthStore();
    const {data: library} = useLibrary();

    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isCollabModalOpen, setCollabModalOpen] = useState(false);

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

    const {url: coverUrl} = useSecureUrl(
        `playlist-cover-${id}`,
        () => playlistApi.getPlaylistCoverBlob(id!),
        !!playlist?.coverMinioPath && !!id
    );

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

    if (isPlaylistLoading) return <div className="p-8 animate-pulse text-slate-500">Loading playlist...</div>;
    if (!playlist) return <div className="p-8 text-center text-slate-400">Playlist not found</div>;


    const isFollowed = library?.some(item => item.id === playlist?.id && item.type === 'FOLLOWED_PLAYLIST') || false;

    const handlePlayPlaylist = () => {
        const playableTracks = mappedTracks.filter(t => t.artistUsername !== 'unavailable');
        if (playableTracks.length > 0) playContext(playableTracks, `playlist:${id}`, 0);
    };


    return (
        <div className="flex flex-col min-h-full transition-colors duration-1000 ease-in-out"
             style={{background: `linear-gradient(to bottom, ${dominantColor} 0%, #121212 400px)`}}>

            <PlaylistHeader
                playlist={playlist}
                coverUrl={coverUrl}
                canEditMetadata={canEditMetadata}
                onEditClick={() => setEditModalOpen(true)}
                onCollabClick={() => setCollabModalOpen(true)}
            />

            <section className="px-8 py-6 flex items-center gap-6 backdrop-blur-3xl border-b border-white/5">
                <Button onClick={handlePlayPlaylist} size="icon"
                        className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 shadow-xl hover:scale-105 transition-transform">
                    <Play size={24} fill="currentColor" className="ml-1"/>
                </Button>

                {!isOwner && !playlist.isSystem && (
                    <Button
                        onClick={() => isFollowed ? unfollowMutation.mutate(playlist.id) : followMutation.mutate(playlist.id)}
                        variant={isFollowed ? "outline" : "default"}
                        className={cn("rounded-full px-6 font-bold tracking-wide transition-all border-2",
                            isFollowed ? "border-white/30 text-white hover:border-white/60 bg-transparent" : "bg-white text-black hover:bg-slate-200 border-transparent")}
                    >
                        {isFollowed ? <><Check className="w-5 h-5 mr-2"/> Saved</> : 'Save'}
                    </Button>
                )}

                {playlist.isCollaborative && (isOwner || isCollaborator) && (
                    <Button variant="ghost" className="rounded-full text-slate-300 hover:text-white hover:bg-white/10"
                            onClick={() => setCollabModalOpen(true)}>
                        <Users className="w-5 h-5 mr-2"/> Participants
                    </Button>
                )}

                {/* Clean Dropdown Encapsulation */}
                <PlaylistDropdownMenu playlist={playlist}>
                    <button className="text-white/60 hover:text-white transition-colors focus:outline-none">
                        <MoreHorizontal size={32}/>
                    </button>
                </PlaylistDropdownMenu>
            </section>

            <section className="px-8 mt-4 pb-20">
                <div
                    className="grid grid-cols-[48px_minmax(120px,1fr)_120px_60px] md:grid-cols-[48px_minmax(120px,1fr)_150px_60px] gap-4 px-4 py-2 mb-2 text-xs font-semibold text-slate-400 border-b border-white/10 uppercase tracking-wider">
                    <div>#</div>
                    <div>Title</div>
                    <div className="hidden md:block">Added At</div>
                    <div className="text-right pr-2"><Clock size={16} className="inline-block"/></div>
                </div>

                <div className="flex flex-col">
                    {isTracksLoading ? (
                        <div className="py-10 text-center text-slate-500 flex justify-center items-center gap-2">
                            <Disc3 className="animate-spin h-5 w-5"/> Syncing library...
                        </div>
                    ) : (
                        mappedTracks.map((track, index) => (
                            <TrackContextMenu
                                key={track.id}
                                track={track}
                            >
                                <TrackCard
                                    track={track}
                                    variant="playlist-row"
                                    index={index + 1}
                                    addedAt={tracksData?.content[index].addedAt}
                                    onPlayOverride={() => playContext(mappedTracks.filter(t => t.artistUsername !== 'unavailable'), `playlist:${id}`, index)}
                                />
                            </TrackContextMenu>
                        ))
                    )}
                </div>
            </section>

            {canEditMetadata && <EditPlaylistModal playlist={playlist} isOpen={isEditModalOpen}
                                                   onClose={() => setEditModalOpen(false)}/>}
            {playlist.isCollaborative && currentUser?.id &&
                <CollaboratorsModal playlist={playlist} currentUserId={currentUser?.id} isOpen={isCollabModalOpen}
                                    onClose={() => setCollabModalOpen(false)}/>}
        </div>
    );
};