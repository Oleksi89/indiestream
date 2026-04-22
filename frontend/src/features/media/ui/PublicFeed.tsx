import {useQuery} from '@tanstack/react-query';
import {mediaApi} from '../api/media.api';
import {Disc3} from 'lucide-react';
import {TrackCard} from './TrackCard';

export const PublicFeed = () => {
    const {data, isLoading, isError} = useQuery({
        queryKey: ['tracks', 'public'],
        queryFn: () => mediaApi.getPublicTracks(0, 12), // Limit to 12 items for the homepage initially
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* Skeleton loading state */}
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-800/50 rounded-xl animate-pulse"/>
                ))}
            </div>
        );
    }

    if (isError || !data || data.content.length === 0) {
        return (
            <div className="p-8 border border-slate-800 rounded-xl bg-slate-900/50 text-center">
                <p className="text-slate-400">No new releases available right now.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {data.content.map((track) => (
                <TrackCard track={track}/>
            ))}
        </div>
    );
};