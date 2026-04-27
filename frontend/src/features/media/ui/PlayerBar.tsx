import {useEffect, useRef, useState} from 'react';
import {usePlayerStore} from '@/shared/store/playerStore';
import {mediaApi} from '../api/media.api';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {Play, Pause, SkipForward, Volume2, Disc3, Settings2, Layers} from 'lucide-react';
import {cn} from '@/shared/lib/utils';

export const PlayerBar = () => {
    const {
        currentTrack, isPlaying, togglePlay, volume, setVolume,
        progress, setProgress, duration, setDuration, setPlaying,
        playbackMode, setPlaybackMode, stemVolumes, setStemVolume
    } = usePlayerStore();

    const [isMixerOpen, setIsMixerOpen] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const hasStems = currentTrack?.stemsMetadata && Object.keys(currentTrack.stemsMetadata).length > 0;

    const {url: audioUrl} = useSecureUrl(
        `audio-${currentTrack?.id}`,
        () => mediaApi.getTrackAudioBlob(currentTrack!.id),
        !!currentTrack && playbackMode === 'master'
    );

    // Securely fetch cover image
    const {url: coverUrl} = useSecureUrl(
        `cover-player-${currentTrack?.id}`,
        () => mediaApi.getTrackCoverBlob(currentTrack!.id),
        !!currentTrack?.coverMinioPath
    );

    // HTML5 Audio control for Master mode
    useEffect(() => {
        if (!audioRef.current || playbackMode !== 'master') return;

        if (isPlaying) {
            if (audioUrl && audioRef.current.src !== audioUrl) {
                audioRef.current.src = audioUrl;
            }
            audioRef.current.play().catch(() => setPlaying(false));
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, audioUrl, playbackMode]);

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
                className="hidden"
            />

            {/* Track Info */}
            <div className="flex items-center gap-4 w-[25%]">
                <div className="h-14 w-14 rounded-lg bg-slate-800 overflow-hidden border border-slate-700 shrink-0">
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
                    <div className="flex items-center gap-2">
                         <span className={cn(
                             "text-[10px] uppercase tracking-wider font-bold",
                             playbackMode === 'stems' ? "text-violet-400" : "text-slate-500"
                         )}>
                            {playbackMode === 'stems' ? 'Stems Mode' : 'Master Track'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Controls */}
            <div className="flex flex-col items-center gap-2 w-[45%]">
                <div className="flex items-center gap-6">
                    <button className="text-slate-400 hover:text-white transition-colors">
                        <SkipForward className="rotate-180" size={20}/>
                    </button>
                    <button onClick={togglePlay}
                            className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform">
                        {isPlaying ? <Pause size={20} fill="black"/> : <Play size={20} fill="black" className="ml-1"/>}
                    </button>
                    <button className="text-slate-400 hover:text-white transition-colors">
                        <SkipForward size={20}/>
                    </button>
                </div>

                <div className="w-full flex items-center gap-3 max-w-md">
                    <span className="text-[10px] text-slate-500 font-mono w-10 text-right">{formatTime(progress)}</span>

                    {/* Robust composite progress slider */}
                    <div className="relative flex-1 h-1 bg-slate-800 rounded-full group flex items-center">
                        <div className="absolute left-0 h-full bg-violet-500 rounded-full"
                             style={{width: `${duration > 0 ? (progress / duration) * 100 : 0}%`}}/>
                        <input type="range" min={0} max={duration || 100} step={0.1} value={progress}
                               onChange={(e) => audioRef.current && (audioRef.current.currentTime = parseFloat(e.target.value))}
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono w-10">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Mixer & Volume Section */}
            <div className="flex items-center justify-end gap-4 w-[30%] relative">
                {/* STEMS Toggle Button */}
                {hasStems && (
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setPlaybackMode('master')}
                            className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", playbackMode === 'master' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300")}
                        >
                            MASTER
                        </button>
                        <button
                            onClick={() => setPlaybackMode('stems')}
                            className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", playbackMode === 'stems' ? "bg-violet-600 text-white" : "text-slate-500 hover:text-slate-300")}
                        >
                            STEMS
                        </button>
                    </div>
                )}

                {/* Mixer Popover Trigger */}
                {hasStems && playbackMode === 'stems' && (
                    <button
                        onClick={() => setIsMixerOpen(!isMixerOpen)}
                        className={cn("p-2 rounded-lg transition-colors", isMixerOpen ? "bg-violet-500/20 text-violet-400" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                    >
                        <Settings2 size={20}/>
                    </button>
                )}

                <div className="flex items-center gap-3">
                    <Volume2 size={18} className="text-slate-400"/>
                    <div className="relative w-24 h-1 bg-slate-800 rounded-full group flex items-center">
                        <div className="absolute left-0 h-full bg-violet-500 rounded-full"
                             style={{width: `${volume * 100}%`}}/>
                        <input type="range" min="0" max="1" step="0.01" value={volume}
                               onChange={(e) => setVolume(parseFloat(e.target.value))}
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                    </div>
                </div>

                {/* Stem Mixer Popover */}
                {isMixerOpen && hasStems && (
                    <div
                        className="absolute bottom-full right-0 mb-4 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
                        <div
                            className="flex items-center gap-2 mb-4 text-slate-200 font-bold text-xs uppercase tracking-widest">
                            <Layers size={14} className="text-violet-400"/>
                            Stem Mixer
                        </div>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {Object.keys(currentTrack.stemsMetadata).map((name) => (
                                <div key={name} className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-medium">
                                        <span className="text-slate-300 truncate pr-2">{name}</span>
                                        <span
                                            className="text-slate-500">{Math.round((stemVolumes[name] || 0) * 100)}%</span>
                                    </div>
                                    <div className="relative h-1 bg-slate-800 rounded-full flex items-center">
                                        <div
                                            className="absolute h-full bg-violet-500 rounded-full"
                                            style={{width: `${(stemVolumes[name] || 0) * 100}%`}}
                                        />
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={stemVolumes[name] || 0}
                                            onChange={(e) => setStemVolume(name, parseFloat(e.target.value))}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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