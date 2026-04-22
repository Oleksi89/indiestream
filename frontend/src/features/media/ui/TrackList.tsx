import {useQuery} from '@tanstack/react-query';
import {mediaApi} from '../api/media.api';
import {useAuthStore} from '@/shared/store/authStore';
import {Disc3, Clock} from 'lucide-react';

export const TrackList = () => {
    const user = useAuthStore((state) => state.user);

    // Using TanStack Query strictly for server state fetching as per constraints
    const {data, isLoading, isError} = useQuery({
        queryKey: ['tracks', user?.id],
        queryFn: () => mediaApi.getArtistTracks(String(user?.id), 0, 20), // Fetching first 20 tracks
        enabled: !!user?.id,
    });

    if (isLoading) {
        return <div className="text-slate-400 animate-pulse flex items-center gap-2"><Disc3
            className="animate-spin"/> Loading tracks...</div>;
    }

    if (isError) {
        return <div className="text-red-400">Failed to load tracks. Please try again.</div>;
    }

    if (!data || data.content.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-700 rounded-xl bg-slate-900/50">
                <Disc3 size={48} className="text-slate-600 mb-4"/>
                <h3 className="text-lg font-medium text-slate-300">No tracks uploaded yet</h3>
                <p className="text-sm text-slate-500 mt-1">Your uploaded music will appear here.</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <h2 className="text-2xl font-bold text-white mb-6">Your Library</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.content.map((track) => (
                    <div key={track.id}
                         className="group relative flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition-colors">

                        {/* Cover Art Wrapper */}
                        <div className="aspect-square w-full bg-slate-800 relative overflow-hidden">
                            {track.coverMinioPath ? (
                                // TODO: [Security] Ensure API endpoint handles JWT auth correctly if images are protected
                                <img
                                    src={`http://localhost:8080/api/v1/tracks/${track.id}/cover`}
                                    alt={track.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                    <Disc3 size={64} className="text-slate-700"/>
                                </div>
                            )}
                        </div>

                        {/* Track Info */}
                        <div className="p-4">
                            <h3 className="text-lg font-semibold text-slate-100 truncate">{track.title}</h3>
                            <div className="flex items-center gap-2 mt-2 text-slate-400 text-sm">
                                <Clock size={14}/>
                                <span>{track.durationSeconds > 0 ? `${Math.floor(track.durationSeconds / 60)}:${(track.durationSeconds % 60).toString().padStart(2, '0')}` : 'Processing...'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};