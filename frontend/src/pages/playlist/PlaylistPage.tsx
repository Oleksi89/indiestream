import {useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {playlistApi} from '@/features/playlist/api/playlist.api';
import {playlistKeys} from '@/features/playlist/hooks/usePlaylists';
import {Clock, Play, Heart, MoreHorizontal, Disc3} from 'lucide-react';
import {Button} from '@/shared/ui/button';
import {TrackContextMenu} from '@/features/media/ui/TrackContextMenu';
import {usePlayerStore} from '@/shared/store/playerStore';
import type {TrackDto} from "@/features/media/types";
import {TrackCard} from "@/features/media/ui/TrackCard.tsx";


export const PlaylistPage = () => {
    const {id} = useParams<{ id: string }>();
    const {setTrack} = usePlayerStore();

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

    if (isPlaylistLoading) return <div className="p-8 animate-pulse text-slate-500">Loading playlist...</div>;
    if (!playlist) return <div className="p-8 text-center text-slate-400">Playlist not found</div>;

    const handlePlayPlaylist = () => {
        if (tracksData?.content && tracksData.content.length > 0) {
            const firstTrack = tracksData.content[0];
            const trackDto: TrackDto = {
                id: firstTrack.trackId,
                title: firstTrack.title,
                artistId: firstTrack.artistId,
                artistAlias: firstTrack.artistAlias,
                durationSeconds: firstTrack.durationSeconds,
                coverMinioPath: firstTrack.coverMinioPath,
                stemsMetadata: {}, // Default empty for playlist view
                minioBucketPath: ''
            };
            setTrack(trackDto);
        }
    };

    return (
        <div className="flex flex-col min-h-full">
            {/* Hero Header */}
            <header
                className="relative flex items-end gap-6 p-8 pb-6 bg-gradient-to-b from-slate-800/50 to-transparent">
                <div className="w-52 h-52 shrink-0 shadow-2xl rounded-xl overflow-hidden bg-slate-800">
                    {playlist.coverMinioPath ? (
                        <img src={playlist.coverMinioPath} className="w-full h-full object-cover" alt=""/>
                    ) : (
                        <div
                            className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center">
                            <span className="text-6xl font-bold">{playlist.name[0]}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Playlist</span>
                    <h1 className="text-7xl font-black tracking-tighter text-white mb-4">{playlist.name}</h1>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                        <span className="text-white hover:underline cursor-pointer">{playlist.ownerAlias}</span>
                        <span>•</span>
                        <span>{playlist.trackCount} tracks</span>
                        <span>•</span>
                        <span className="text-slate-500">{Math.floor(playlist.totalDurationSeconds / 60)} min</span>
                    </div>
                </div>
            </header>

            {/* Action Bar */}
            <section className="px-8 py-4 flex items-center gap-6">
                <Button
                    onClick={handlePlayPlaylist}
                    size="icon"
                    className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 shadow-xl hover:scale-105 transition-transform"
                >
                    <Play size={24} fill="currentColor" className="ml-1"/>
                </Button>
                <button className="text-slate-400 hover:text-white transition-colors">
                    <Heart size={32}/>
                </button>
                <button className="text-slate-400 hover:text-white transition-colors">
                    <MoreHorizontal size={32}/>
                </button>
            </section>

            {/* Tracks List (CSS Grid Table) */}
            <section className="px-8 mt-4 pb-20">
                {/* Header Row */}
                <div
                    className="grid grid-cols-[48px_minmax(120px,1fr)_120px_60px] md:grid-cols-[48px_minmax(120px,1fr)_150px_60px] gap-4 px-4 py-2 mb-2 text-xs font-semibold text-slate-500 border-b border-slate-800/50 uppercase tracking-wider">
                    <div>#</div>
                    <div>Title</div>
                    <div className="hidden md:block">Added At</div>
                    <div className="text-right pr-2"><Clock size={16} className="inline-block"/></div>
                </div>

                {/* Body Rows */}
                <div className="flex flex-col">
                    {isTracksLoading ? (
                        <div className="py-10 text-center text-slate-600 flex justify-center items-center gap-2">
                            <Disc3 className="animate-spin h-5 w-5"/> Syncing tracks...
                        </div>
                    ) : (
                        tracksData?.content.map((track, index) => {
                            const mappedTrack: TrackDto = {
                                id: track.trackId,
                                title: track.title,
                                artistId: track.artistId,
                                artistAlias: track.artistAlias,
                                durationSeconds: track.durationSeconds,
                                coverMinioPath: track.coverMinioPath,
                                stemsMetadata: {},
                                minioBucketPath: ''
                            };

                            return (
                                <TrackContextMenu key={track.trackId} track={mappedTrack}>
                                    <TrackCard
                                        track={mappedTrack}
                                        variant="playlist-row"
                                        index={index + 1}
                                        addedAt={track.addedAt}
                                    />
                                </TrackContextMenu>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
};