import {mediaApi} from '../api/media.api';
import type {TrackDto} from '../types';
import {Disc3, Clock, Image as ImageIcon, Play, Pause, Layers, User} from 'lucide-react';
import {usePlayerStore} from '@/shared/store/playerStore';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {cn} from '@/shared/lib/utils';

interface TrackCardProps {
    track: TrackDto;
}

export const TrackCard = ({track}: TrackCardProps) => {
    const {currentTrack, isPlaying, setTrack, togglePlay} = usePlayerStore();
    const isCurrentTrack = currentTrack?.id === track.id;

    // Securely fetch cover image
    const {url: coverUrl, isLoading: isCoverLoading} = useSecureUrl(
        `cover-${track.id}`,
        () => mediaApi.getTrackCoverBlob(track.id),
        !!track.coverMinioPath
    );

    const hasStems = track.stemsMetadata && Object.keys(track.stemsMetadata).length > 0;

    const handlePlayClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isCurrentTrack) {
            togglePlay();
        } else {
            setTrack(track);
        }
    };

    return (
        <div
            className="group flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all duration-300 shadow-lg">

            {/* Visual Part */}
            <div className="aspect-square w-full bg-slate-800 relative overflow-hidden">
                {track.coverMinioPath ? (
                    isCoverLoading ? (
                        <div className="w-full h-full flex items-center justify-center animate-pulse">
                            <ImageIcon size={32} className="text-slate-600"/>
                        </div>
                    ) : (
                        <img
                            src={coverUrl || ''}
                            alt={track.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    )
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Disc3 size={64} className="text-slate-700"/>
                    </div>
                )}

                {/* STEMS Badge Overlay */}
                {hasStems && (
                    <div
                        className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm border border-violet-500/50 text-violet-300 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1.5 shadow-xl">
                        <Layers size={12}/>
                        Stems
                    </div>
                )}
            </div>

            {/* Content Part */}
            <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0 flex-1">
                    <h3 className={cn(
                        "text-base font-semibold truncate transition-colors",
                        isCurrentTrack ? "text-violet-400" : "text-slate-100"
                    )}>
                        {track.title}
                    </h3>
                    {/* Added Artist Alias */}
                    <div
                        className="flex items-center gap-1.5 mt-0.5 text-slate-400 text-xs hover:text-slate-300 transition-colors cursor-pointer truncate">
                        <User size={12} className="shrink-0"/>
                        <span className="truncate">{track.artistAlias}</span>
                    </div>
                    <div
                        className="flex items-center gap-2 mt-1.5 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                        <Clock size={12}/>
                        <span>{track.durationSeconds > 0 ? `${Math.floor(track.durationSeconds / 60)}:${(track.durationSeconds % 60).toString().padStart(2, '0')}` : '0:00'}</span>
                    </div>
                </div>

                {/* Controls moved to the bottom */}
                <button
                    onClick={handlePlayClick}
                    className={cn(
                        "h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center transition-all shadow-md",
                        isCurrentTrack && isPlaying
                            ? "bg-slate-800 text-violet-400 border border-violet-500/30"
                            : "bg-violet-600 text-white hover:bg-violet-500"
                    )}
                >
                    {isCurrentTrack && isPlaying ? (
                        <Pause size={18} fill="currentColor"/>
                    ) : (
                        <Play size={18} fill="currentColor" className="ml-0.5"/>
                    )}
                </button>
            </div>
        </div>
    );
};