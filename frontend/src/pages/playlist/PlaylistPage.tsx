import {useMemo, useState, useEffect} from 'react';
import {Link, useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {FastAverageColor} from 'fast-average-color';
import {playlistApi} from '@/features/playlist/api/playlist.api';
import {playlistKeys, useFollowPlaylist, useUnfollowPlaylist} from '@/features/playlist/hooks/usePlaylists';
import {usePlaylistPermissions} from '@/features/playlist/hooks/usePlaylistPermissions';
import {useLibrary} from '@/features/library/hooks/useLibrary';
import {Clock, Play, MoreHorizontal, Disc3, Check, Pencil, Users} from 'lucide-react';
import {Button} from '@/shared/ui/button';
import {cn} from '@/shared/lib/utils';
import {TrackContextMenu} from '@/features/media/ui/TrackContextMenu';
import {usePlayerStore} from '@/shared/store/playerStore';
import {useAuthStore} from '@/shared/store/authStore';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {UserAvatar} from '@/shared/components/UserAvatar';
import {TrackCard} from "@/features/media/ui/TrackCard";
import {EditPlaylistModal} from "@/features/playlist/ui/EditPlaylistModal";
import {CollaboratorsModal} from "@/features/playlist/ui/CollaboratorsModal";
import type {TrackDto} from "@/features/media/types";

export const PlaylistPage = () => {
    const {id} = useParams<{ id: string }>();
    const {playContext} = usePlayerStore();
    const {user: currentUser} = useAuthStore();
    const {data: library} = useLibrary();

    const [dominantColor, setDominantColor] = useState<string>('#1e293b'); // Fallback slate-800
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

    // Secure blob proxy fetching
    const {url: coverUrl} = useSecureUrl(
        `playlist-cover-${id}`,
        () => playlistApi.getPlaylistCoverBlob(id!),
        !!playlist?.coverMinioPath && !!id
    );

    // Extraction Engine for Tailwind UI Gradients
    useEffect(() => {
        if (!coverUrl) {
            queueMicrotask(() => setDominantColor('#1e293b'));
            return;
        }

        const fac = new FastAverageColor();
        fac.getColorAsync(coverUrl, {algorithm: 'dominant'})
            .then(color => setDominantColor(color.hex))
            .catch(e => console.error('Color extraction failed', e));

        return () => fac.destroy();
    }, [coverUrl]);

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
            minioBucketPath: ''
        }));
    }, [tracksData]);

    const {isOwner, isCollaborator, canEditMetadata} = usePlaylistPermissions(playlist, currentUser?.id);

    if (isPlaylistLoading) return <div className="p-8 animate-pulse text-slate-500">Loading playlist...</div>;
    if (!playlist) return <div className="p-8 text-center text-slate-400">Playlist not found</div>;


    const isFollowed = library?.some(item => item.id === playlist?.id && item.type === 'FOLLOWED_PLAYLIST') || false;

    const handlePlayPlaylist = () => {
        if (mappedTracks.length > 0) playContext(mappedTracks, `playlist:${id}`, 0);
    };

    const handleFollowToggle = () => {
        if (isFollowed) unfollowMutation.mutate(playlist.id);
        else followMutation.mutate(playlist.id);
    };

    return (
        <div className="flex flex-col min-h-full transition-colors duration-1000 ease-in-out"
             style={{background: `linear-gradient(to bottom, ${dominantColor} 0%, #121212 400px)`}}>
            <header className="relative flex items-end gap-6 p-8 pb-6 mt-16 lg:mt-24">
                <div
                    className="group relative w-52 h-52 shrink-0 shadow-2xl rounded-xl overflow-hidden bg-slate-800/50 cursor-pointer"
                    onClick={() => canEditMetadata && !playlist.isSystem && setEditModalOpen(true)}
                >
                    {coverUrl ? (
                        <img src={coverUrl}
                             className="w-full h-full object-cover transition-transform group-hover:scale-105"
                             alt="Cover"/>
                    ) : (
                        <div className="w-full h-full bg-black/20 flex items-center justify-center">
                            <span className="text-6xl font-bold opacity-50">{playlist.name[0]}</span>
                        </div>
                    )}

                    {canEditMetadata && !playlist.isSystem && (
                        <div
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white">
                            <Pencil size={32}/>
                            <span className="text-sm font-semibold tracking-wide">Edit Cover</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 z-10 text-white w-full">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/80 flex items-center gap-2">
                        {playlist.isPublic ? 'Public Playlist' : 'Private Playlist'}
                        {playlist.isCollaborative &&
                            <span className="bg-white/20 px-2 py-0.5 rounded-full">Collaborative</span>}
                    </span>

                    <h1
                        className="text-6xl lg:text-7xl font-black tracking-tighter mb-4 cursor-pointer hover:underline line-clamp-2"
                        onClick={() => canEditMetadata && !playlist.isSystem && setEditModalOpen(true)}
                    >
                        {playlist.name}
                    </h1>

                    {playlist.description && (
                        <p className="text-sm font-medium text-white/70 max-w-2xl">{playlist.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-sm font-medium text-white/90 mt-2">

                        {/* Avatar Group Engine */}
                        {playlist.isCollaborative && (
                            <div
                                className="flex items-center -space-x-2 mr-1 cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setCollabModalOpen(true)}
                            >
                                <UserAvatar
                                    username={playlist.ownerUsername}
                                    avatarPath={playlist.ownerAvatarPath}
                                    className="w-8 h-8 border-2 border-slate-900 shadow-sm relative z-30"
                                />
                                {playlist.collaborators?.slice(0, 3).map((collab, index) => (
                                    <div
                                        key={collab.id}
                                        style={{zIndex: 20 - index}}
                                        className="relative"
                                    >
                                        <UserAvatar
                                            username={collab.username}
                                            avatarPath={collab.avatarPath}
                                            className="w-8 h-8 border-2 border-slate-900 shadow-sm"
                                        />
                                    </div>
                                ))}
                                {(playlist.collaborators?.length || 0) > 3 && (
                                    <div
                                        className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold border-2 border-slate-900 z-0">
                                        +{(playlist.collaborators?.length || 0) - 3}
                                    </div>
                                )}
                            </div>
                        )}

                        <Link to={`/user/${playlist.ownerUsername}`}
                              className="hover:underline cursor-pointer font-bold">
                            {playlist.ownerAlias}
                        </Link>
                        <span>•</span>
                        {playlist.followersCount > 0 && (
                            <>
                                <span>{playlist.followersCount} saves</span>
                                <span>•</span>
                            </>
                        )}
                        <span>{playlist.trackCount} tracks</span>
                        <span>•</span>
                        <span className="text-white/60">{Math.floor(playlist.totalDurationSeconds / 60)} min</span>
                    </div>
                </div>
            </header>

            <section
                className="px-8 py-6 flex items-center gap-6 backdrop-blur-3xl border-b border-white/5">
                <Button onClick={handlePlayPlaylist} size="icon"
                        className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 shadow-xl hover:scale-105 transition-transform">
                    <Play size={24} fill="currentColor" className="ml-1"/>
                </Button>

                {!isOwner && !playlist.isSystem && (
                    <Button
                        onClick={handleFollowToggle}
                        variant={isFollowed ? "outline" : "default"}
                        className={cn(
                            "rounded-full px-6 font-bold tracking-wide transition-all border-2",
                            isFollowed
                                ? "border-white/30 text-white hover:border-white/60 bg-transparent"
                                : "bg-white text-black hover:bg-slate-200 border-transparent"
                        )}
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

                <button className="text-white/60 hover:text-white transition-colors">
                    <MoreHorizontal size={32}/>
                </button>
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
                            <TrackContextMenu key={track.id} track={track}>
                                <TrackCard
                                    track={track}
                                    variant="playlist-row"
                                    index={index + 1}
                                    addedAt={tracksData?.content[index].addedAt}
                                    onPlayOverride={() => playContext(mappedTracks, `playlist:${id}`, index)}
                                />
                            </TrackContextMenu>
                        ))
                    )}
                </div>
            </section>

            {canEditMetadata && (
                <EditPlaylistModal playlist={playlist} isOpen={isEditModalOpen}
                                   onClose={() => setEditModalOpen(false)}/>
            )}

            {playlist.isCollaborative && currentUser?.id && (
                <CollaboratorsModal playlist={playlist} currentUserId={currentUser?.id} isOpen={isCollabModalOpen}
                                    onClose={() => setCollabModalOpen(false)}/>
            )}
        </div>
    );
};