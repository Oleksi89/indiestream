import {mediaApi} from '../api/media.api';
import type {TrackDto} from '../types';
import {Disc3, Clock, Image as ImageIcon, Play, Pause, Layers, User} from 'lucide-react';
import {usePlayerStore} from '@/shared/store/playerStore';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {cn} from '@/shared/lib/utils';
import React from 'react';

export interface TrackCardProps {
    track: TrackDto;
    variant: 'list' | 'grid' | 'compact' | 'playlist-row';
    className?: string;
    index?: number;
    addedAt?: string;
    onClick?: () => void;
    onPlayOverride?: () => void; // for Context Playback
}

export const TrackCard = ({track, variant, className, index, addedAt, onClick, onPlayOverride}: TrackCardProps) => {
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
        } else if (onPlayOverride) {
            onPlayOverride(); // If the parent component passed the context
        } else {
            setTrack(track);
        }
    };

    const formatDuration = (seconds: number) => {
        return seconds > 0
            ? `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
            : '0:00';
    };

    const renderCover = (sizeClass: string = "w-full h-full") => {
        if (!track.coverMinioPath) {
            return (
                <div className={`${sizeClass} flex items-center justify-center bg-slate-800`}>
                    <Disc3 size={variant === 'compact' || variant === 'playlist-row' ? 16 : 32}
                           className="text-slate-600"/>
                </div>
            );
        }
        if (isCoverLoading) {
            return (
                <div className={`${sizeClass} flex items-center justify-center bg-slate-800 animate-pulse`}>
                    <ImageIcon size={variant === 'compact' || variant === 'playlist-row' ? 16 : 32}
                               className="text-slate-600"/>
                </div>
            );
        }
        return (
            <img
                src={coverUrl || ''}
                alt={track.title}
                className={`${sizeClass} object-cover group-hover:scale-105 transition-transform duration-500`}
            />
        );
    };

    if (variant === 'playlist-row') {
        return (
            <div
                onDoubleClick={() => onPlayOverride ? onPlayOverride() : setTrack(track)}
                className={cn(
                    "group grid grid-cols-[48px_minmax(120px,1fr)_120px_60px] md:grid-cols-[48px_minmax(120px,1fr)_150px_60px] gap-4 px-4 py-2.5 items-center rounded-md hover:bg-white/5 transition-colors cursor-pointer w-full border border-transparent",
                    isCurrentTrack && "bg-slate-800/30 border-slate-800/50",
                    className
                )}
            >
                <div className="text-sm font-mono text-slate-500 flex items-center h-full">
                    {isCurrentTrack && isPlaying ? (
                        <div className="w-4 h-4 flex items-end justify-between gap-[2px]">
                            <div className="w-1 bg-violet-500 h-full animate-[bounce_1s_infinite]"/>
                            <div className="w-1 bg-violet-500 h-2/3 animate-[bounce_1s_infinite_100ms]"/>
                            <div className="w-1 bg-violet-500 h-3/4 animate-[bounce_1s_infinite_200ms]"/>
                        </div>
                    ) : isCurrentTrack ? (
                        <span className="text-violet-500 font-bold">{index}</span>
                    ) : (
                        <span className="group-hover:hidden">{index}</span>
                    )}
                    {!isCurrentTrack && (
                        <Play size={16} fill="currentColor" onClick={handlePlayClick}
                              className="hidden group-hover:block text-slate-300 hover:text-white"/>
                    )}
                </div>

                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="w-10 h-10 bg-slate-800 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {renderCover()}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span
                            className={cn("text-[15px] font-medium truncate flex items-center gap-2", isCurrentTrack ? "text-violet-400" : "text-white")}>
                            {track.title}
                            {hasStems && (
                                <span
                                    className="bg-slate-800 text-violet-400 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Layers size={10}/>
                                </span>
                            )}
                        </span>
                        <span
                            className="text-xs text-slate-400 hover:text-slate-300 hover:underline transition-colors truncate">
                            {track.artistAlias}
                        </span>
                    </div>
                </div>

                <div className="hidden md:block text-[13px] text-slate-500 truncate">
                    {addedAt ? new Date(addedAt).toLocaleDateString() : '-'}
                </div>

                <div className="text-right pr-2 text-[13px] font-mono text-slate-500">
                    {formatDuration(track.durationSeconds)}
                </div>
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <div
                onClick={onClick}
                className={cn(
                    "group flex items-center gap-3 p-2 rounded-md hover:bg-slate-800/60 transition-colors cursor-pointer w-full max-w-[240px]",
                    isCurrentTrack && "bg-slate-800/40",
                    className
                )}
            >
                <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden relative">
                    {renderCover()}
                    <div
                        className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={16} fill="currentColor" className="text-white ml-0.5"/>
                    </div>
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className={cn(
                        "text-sm font-medium truncate",
                        isCurrentTrack ? "text-violet-400" : "text-slate-100"
                    )}>
                        {track.title}
                    </span>
                    <span className="text-xs text-slate-400 truncate">{track.artistAlias}</span>
                </div>
            </div>
        );
    }

    if (variant === 'list') {
        return (
            <div
                onClick={onClick}
                className={cn(
                    "group flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/40 border border-transparent hover:border-slate-800 transition-all w-full cursor-pointer",
                    isCurrentTrack && "bg-slate-800/30 border-slate-800",
                    className
                )}
            >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="relative h-12 w-12 flex-shrink-0 rounded-md overflow-hidden bg-slate-800 shadow-sm">
                        {renderCover()}
                        <button
                            onClick={handlePlayClick}
                            className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-900/80"
                        >
                            {isCurrentTrack && isPlaying ? (
                                <Pause size={20} fill="currentColor" className="text-violet-400"/>
                            ) : (
                                <Play size={20} fill="currentColor" className="text-white ml-0.5"/>
                            )}
                        </button>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className={cn(
                            "text-[15px] font-medium truncate flex items-center gap-2",
                            isCurrentTrack ? "text-violet-400" : "text-slate-100"
                        )}>
                            {track.title}
                            {hasStems && (
                                <span
                                    className="bg-slate-800 text-violet-400 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Layers size={10}/> Stems
                                </span>
                            )}
                        </span>
                        <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                            <User size={12} className="shrink-0"/>
                            <span className="truncate hover:text-slate-300 transition-colors">{track.artistAlias}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-400 flex-shrink-0 ml-4 px-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                        <Clock size={14}/>
                        <span>{formatDuration(track.durationSeconds)}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Default 'grid' variant
    return (
        <div
            onClick={onClick}
            className={cn(
                "group flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all duration-300 shadow-lg cursor-pointer",
                isCurrentTrack && "border-violet-500/50",
                className
            )}
        >
            <div className="aspect-square w-full bg-slate-800 relative overflow-hidden">
                {renderCover()}

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
                        className="flex items-center gap-1.5 mt-0.5 text-slate-400 text-xs hover:text-slate-300 transition-colors truncate">
                        <User size={12} className="shrink-0"/>
                        <span className="truncate">{track.artistAlias}</span>
                    </div>
                    <div
                        className="flex items-center gap-2 mt-1.5 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                        <Clock size={12}/>
                        <span>{formatDuration(track.durationSeconds)}</span>
                    </div>
                </div>

                {/* Controls moved to the bottom */}
                <button
                    onClick={handlePlayClick}
                    className={cn(
                        "h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center transition-all shadow-md",
                        isCurrentTrack && isPlaying
                            ? "bg-slate-800 text-violet-400 border border-violet-500/30 hover:bg-slate-700"
                            : "bg-violet-600 text-white hover:bg-violet-500 hover:scale-105"
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