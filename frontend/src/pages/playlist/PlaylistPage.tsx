import React from 'react';
import {useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {playlistApi} from '@/features/playlist/api/playlist.api';
import {playlistKeys} from '@/features/playlist/hooks/usePlaylists';
import {Clock, Play, Heart, MoreHorizontal} from 'lucide-react';
import {Button} from '@/shared/ui/button';

export const PlaylistPage = () => {
    const {id} = useParams<{ id: string }>();

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

    return (
        <div className="flex flex-col min-h-full">
            {/* Hero Header */}
            <header
                className="relative flex items-end gap-6 p-8 pb-6 bg-gradient-to-b from-slate-800/50 to-transparent">
                <div className="w-52 h-52 shrink-0 shadow-2xl rounded-lg overflow-hidden bg-slate-800">
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
                        <span
                            className="text-white hover:underline cursor-pointer">User {playlist.ownerId.slice(0, 8)}</span>
                        <span>•</span>
                        <span>{playlist.trackCount} tracks</span>
                        <span>•</span>
                        <span className="text-slate-500">{Math.floor(playlist.totalDurationSeconds / 60)} min</span>
                    </div>
                </div>
            </header>

            {/* Action Bar */}
            <section className="px-8 py-4 flex items-center gap-6">
                <Button size="icon" className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 shadow-xl">
                    <Play size={24} fill="currentColor" className="ml-1"/>
                </Button>
                <button className="text-slate-400 hover:text-white transition-colors">
                    <Heart size={32}/>
                </button>
                <button className="text-slate-400 hover:text-white transition-colors">
                    <MoreHorizontal size={32}/>
                </button>
            </section>

            {/* Tracks Table */}
            <section className="px-8 mt-4">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="text-xs font-semibold text-slate-500 border-b border-slate-800/50 uppercase tracking-wider">
                        <th className="py-3 pl-4 w-12">#</th>
                        <th className="py-3">Title</th>
                        <th className="py-3 hidden md:table-cell">Added At</th>
                        <th className="py-3 text-right pr-4"><Clock size={16} className="inline-block"/></th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-transparent">
                    {isTracksLoading ? (
                        <tr>
                            <td colSpan={4} className="py-10 text-center text-slate-600">Syncing tracks...</td>
                        </tr>
                    ) : (
                        tracksData?.content.map((track, index) => (
                            <tr key={track.trackId}
                                className="group hover:bg-white/5 transition-colors rounded-md overflow-hidden">
                                <td className="py-3 pl-4 text-sm font-mono text-slate-500">{index + 1}</td>
                                <td className="py-3 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-800 rounded overflow-hidden">
                                        {track.coverMinioPath &&
                                            <img src={track.coverMinioPath} className="w-full h-full object-cover"/>}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-white truncate">{track.title}</span>
                                        <span
                                            className="text-xs text-slate-400 hover:underline cursor-pointer truncate">{track.artistName}</span>
                                    </div>
                                </td>
                                <td className="py-3 hidden md:table-cell text-xs text-slate-500">
                                    {new Date(track.addedAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 text-right pr-4 text-xs font-mono text-slate-500">
                                    {Math.floor(track.durationSeconds / 60)}:{(track.durationSeconds % 60).toString().padStart(2, '0')}
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </section>
        </div>
    );
};