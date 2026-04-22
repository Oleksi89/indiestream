import {useQuery} from '@tanstack/react-query';
import {mediaApi} from '../api/media.api';
import type {TrackDto} from '../types';
import {Disc3, Clock, Image as ImageIcon} from 'lucide-react';

/**
 * Securely fetches and displays a track cover using a Blob URL.
 */
const SecureTrackCover = ({trackId}: { trackId: string }) => {
    const {data: imageUrl, isLoading, isError} = useQuery({
        queryKey: ['trackCover', trackId],
        queryFn: () => mediaApi.getTrackCoverUrl(trackId),
        staleTime: Infinity,
        gcTime: 1000 * 60 * 30,
    });

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 animate-pulse">
                <ImageIcon size={32} className="text-slate-600"/>
            </div>
        );
    }

    if (isError || !imageUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <Disc3 size={64} className="text-slate-700"/>
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt="Track Cover"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
    );
};

interface TrackCardProps {
    track: TrackDto;
}

export const TrackCard = ({track}: TrackCardProps) => {
    return (
        <div
            className="group relative flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition-colors cursor-pointer">
            <div className="aspect-square w-full bg-slate-800 relative overflow-hidden">
                {track.coverMinioPath ? (
                    <SecureTrackCover trackId={track.id}/>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Disc3 size={64} className="text-slate-700"/>
                    </div>
                )}
            </div>

            <div className="p-4">
                <h3 className="text-lg font-semibold text-slate-100 truncate">{track.title}</h3>
                <div className="flex items-center gap-2 mt-2 text-slate-400 text-sm">
                    <Clock size={14}/>
                    {/* TODO: [Media] - Extract duration formatting to a utility function */}
                    <span>{track.durationSeconds > 0 ? `${Math.floor(track.durationSeconds / 60)}:${(track.durationSeconds % 60).toString().padStart(2, '0')}` : 'Processing...'}</span>
                </div>
            </div>
        </div>
    );
};