import {useQuery} from '@tanstack/react-query';
import {mediaApi} from '../api/media.api';
import {useAuthStore} from '@/shared/store/authStore';
import {Disc3} from 'lucide-react';
import {TrackCard} from './TrackCard';
import {TrackContextMenu} from './TrackContextMenu';

export const TrackList = () => {
    const user = useAuthStore((state) => state.user);

    // Using TanStack Query strictly for server state fetching as per constraints
    const {data, isLoading, isError} = useQuery({
        queryKey: ['tracks', 'artist', user?.id],
        queryFn: () => mediaApi.getArtistTracks(String(user?.id), 0, 20),
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
                    <TrackContextMenu key={track.id} track={track}>
                        <TrackCard track={track} variant="grid"/>
                    </TrackContextMenu>
                ))}
            </div>
        </div>
    );
};