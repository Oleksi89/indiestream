import React, {useEffect, useRef} from 'react';
import {usePlayerStore} from '@/shared/store/playerStore';
import {mediaApi} from '../api/media.api';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {Play, Pause, SkipForward, Volume2, Disc3} from 'lucide-react';

export const PlayerBar = () => {
    const {
        currentTrack, isPlaying, togglePlay, volume, setVolume,
        progress, setProgress, duration, setDuration, setPlaying
    } = usePlayerStore();

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Securely fetch audio stream as Blob
    const {url: audioUrl} = useSecureUrl(
        `audio-${currentTrack?.id}`,
        () => mediaApi.getTrackAudioBlob(currentTrack!.id),
        !!currentTrack
    );

    // Securely fetch cover image
    const {url: coverUrl} = useSecureUrl(
        `cover-player-${currentTrack?.id}`,
        () => mediaApi.getTrackCoverBlob(currentTrack!.id),
        !!currentTrack?.coverMinioPath
    );

    useEffect(() => {
        if (!audioRef.current || !audioUrl) return;

        if (isPlaying) {
            // Re-sync with the newly generated secure URL if it changed
            if (audioRef.current.src !== audioUrl) {
                audioRef.current.src = audioUrl;
            }
            audioRef.current.play().catch(err => {
                console.error("Playback failed:", err);
                setPlaying(false);
            });
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, audioUrl, currentTrack]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume;
    }, [volume]);

    if (!currentTrack) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 h-24 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-6 py-3 flex items-center justify-between z-50">
            <audio
                ref={audioRef}
                onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
                onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
                onEnded={() => setPlaying(false)}
            />

            {/* Track Info */}
            <div className="flex items-center gap-4 w-[30%]">
                <div className="h-14 w-14 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                    {coverUrl ? (
                        <img src={coverUrl} alt={currentTrack.title} className="h-full w-full object-cover"/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Disc3 className="text-slate-600"/>
                        </div>
                    )}
                </div>
                <div className="flex flex-col truncate">
                    <span className="text-white font-semibold truncate">{currentTrack.title}</span>
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-medium mt-0.5">
                        Master Track
                    </span>
                </div>
            </div>

            {/* Controls (Keeping existing logic but ensuring UI consistency) */}
            <div className="flex flex-col items-center gap-2 w-[40%]">
                <div className="flex items-center gap-6">
                    <button className="text-slate-400 hover:text-white transition-colors"><SkipForward
                        className="rotate-180" size={20}/></button>
                    <button onClick={togglePlay}
                            className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform">
                        {isPlaying ? <Pause size={20} fill="black"/> : <Play size={20} fill="black" className="ml-1"/>}
                    </button>
                    <button className="text-slate-400 hover:text-white transition-colors"><SkipForward size={20}/>
                    </button>
                </div>

                <div className="w-full flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-mono w-10 text-right">{formatTime(progress)}</span>
                    <div className="relative flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-violet-500"
                             style={{width: `${(progress / duration) * 100}%`}}/>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono w-10">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Volume Section */}
            <div className="flex items-center justify-end gap-3 w-[30%]">
                <Volume2 size={18} className="text-slate-400"/>
                <input
                    type="range" min="0" max="1" step="0.01" value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-24 accent-violet-500 h-1 bg-slate-800 rounded-full cursor-pointer"
                />
            </div>
        </div>
    );
};

const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};