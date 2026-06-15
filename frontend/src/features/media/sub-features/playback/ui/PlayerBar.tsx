import {useEffect, useRef, useState} from 'react';
import {usePlayerStore} from '@/shared/store/playerStore.ts';
import {useAuthStore} from '@/shared/store/authStore.ts';
import {mediaApi} from '../../../api/media.api.ts';
import {useWebAudio} from '../hooks/useWebAudio.ts';
import {
    Play, Pause, SkipForward, SkipBack, Volume2, Disc3, Settings2,
    Loader2, Shuffle, Repeat, Repeat1, ListVideo
} from 'lucide-react';
import {cn} from '@/shared/lib/utils.ts';
import {audioEngine} from "@/features/media/sub-features/playback/lib/webAudioEngine.ts";
import Hls from "hls.js";
import {PlayerTrackInfo} from "@/features/media/sub-features/playback/ui/components/PlayerTrackInfo";
import {useAutoplayEngine} from "@/features/media/sub-features/playback/hooks/useAutoplayEngine";

/**
 * Global Player Bar Component.
 * Manages dual-engine playback: hls.js standard streaming for Master
 * and synchronized hls.js + Web Audio API routing for Stems.
 */
export const PlayerBar = () => {
    const {
        currentTrack, isPlaying, togglePlay, volume, setVolume,
        progress, setProgress, duration, setDuration, setPlaying,
        playbackMode, setPlaybackMode, stemVolumes, setStemVolume,
        playNext, playPrevious, isShuffle, toggleShuffle, repeatMode, setRepeatMode, toggleQueue, isQueueOpen,
     } = usePlayerStore();

    const token = useAuthStore(state => state.token);
    useAutoplayEngine();

    const [isMixerOpen, setIsMixerOpen] = useState(false);
    const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const masterHlsRef = useRef<Hls | null>(null);

    const {isStemsLoading, stemsError, seekStems} = useWebAudio();

    const trackId = currentTrack?.id;
    const hasStems = currentTrack?.stemsMetadata && Object.keys(currentTrack.stemsMetadata).length > 0;

    useEffect(() => {
        if (!isPlaylistMenuOpen) return;
        const close = () => setIsPlaylistMenuOpen(false);
        document.addEventListener('click', close);
        window.addEventListener('scroll', close, {passive: true});
        return () => {
            document.removeEventListener('click', close);
            window.removeEventListener('scroll', close);
        };
    }, [isPlaylistMenuOpen]);

    // Init HLS for Master Track
    useEffect(() => {
        if (!audioRef.current || !trackId || playbackMode !== 'master') return;

        if (masterHlsRef.current) {
            masterHlsRef.current.destroy();
            masterHlsRef.current = null;
        }

        // Reset time explicitly to prevent ghost progress state
        audioRef.current.currentTime = 0;

        const masterUrl = mediaApi.getHlsManifestUrl(trackId, 'master');

        if (Hls.isSupported()) {
            const hls = new Hls({
                xhrSetup: (xhr) => {
                    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
            });
            hls.loadSource(masterUrl);
            hls.attachMedia(audioRef.current);
            masterHlsRef.current = hls;

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const {isPlaying} = usePlayerStore.getState();
                if (isPlaying && audioRef.current) {
                    audioRef.current.play().catch((e) => {
                        // Only pause on hard autoplay policy blocks, ignore AbortError during fast skips
                        if (e.name === 'NotAllowedError') setPlaying(false);
                    });
                }
            });
        } else if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            audioRef.current.src = masterUrl;
            audioRef.current.addEventListener('loadedmetadata', () => {
                const {isPlaying} = usePlayerStore.getState();
                if (isPlaying && audioRef.current) {
                    audioRef.current.play().catch((e) => {
                        if (e.name === 'NotAllowedError') setPlaying(false);
                    });
                }
            }, {once: true});
        }

        return () => {
            if (masterHlsRef.current) {
                masterHlsRef.current.destroy();
            }
        };
    }, [trackId, playbackMode, token, setPlaying]);


    // Transport state synchronization
    useEffect(() => {
        if (!audioRef.current) return;

        if (playbackMode === 'stems') {
            audioRef.current.pause();
            return;
        }

        if (isPlaying) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch((e) => {
                    if (e.name === 'NotAllowedError') setPlaying(false);
                });
            }
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, playbackMode, trackId, setPlaying]);

    // Volume synchronization for Master Engine
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume;
    }, [volume]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setProgress(newTime);

        if (playbackMode === 'master' && audioRef.current) {
            audioRef.current.currentTime = newTime;
        } else if (playbackMode === 'stems') {
            seekStems(newTime);
            if (isPlaying) {
                audioEngine.resumeContext();
            }
        }
    };

    const handleRepeatClick = () => {
        if (repeatMode === 'OFF') setRepeatMode('CONTEXT');
        else if (repeatMode === 'CONTEXT') setRepeatMode('TRACK');
        else setRepeatMode('OFF');
    };

    if (!currentTrack || !trackId) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 h-24 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-6 py-3 flex items-center justify-between z-50">
            {/* Master Engine (Hidden) */}
            <audio
                ref={audioRef}
                crossOrigin="anonymous"
                onTimeUpdate={() => {
                    if (playbackMode === 'master' && audioRef.current) {
                        setProgress(audioRef.current.currentTime);
                    }
                }}
                onLoadedMetadata={() => {
                    if (playbackMode === 'master' && audioRef.current) {
                        // Prioritize exact duration from backend over browser estimation
                        setDuration(currentTrack.durationSeconds || audioRef.current.duration);
                    }
                }}
                onEnded={() => {
                    const state = usePlayerStore.getState();
                    if (state.repeatMode === 'TRACK' && audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(console.warn);
                    }
                    setProgress(0);
                    playNext();
                }}
                className="hidden"
            />

            {/* Track Info & Status */}
            <PlayerTrackInfo isStemsLoading={isStemsLoading}/>

            {/* Main Controls */}
            <div className="flex flex-col items-center gap-2 w-[45%]">
                <div className="flex items-center gap-6">
                    <button
                        onClick={toggleShuffle}
                        className={cn("transition-colors", isShuffle ? "text-violet-400" : "text-slate-400 hover:text-white")}
                    >
                        <Shuffle size={16}/>
                    </button>

                    <button
                        onClick={playPrevious}
                        className="text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                        disabled={isStemsLoading}
                    >
                        <SkipBack size={20}/>
                    </button>

                    <button
                        onClick={togglePlay}
                        disabled={isStemsLoading}
                        className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform disabled:bg-slate-700 disabled:scale-100"
                    >
                        {isStemsLoading ? <Loader2 className="animate-spin" size={20}/> : isPlaying ?
                            <Pause size={20} fill="black"/> : <Play size={20} fill="black" className="ml-1"/>}
                    </button>

                    <button
                        onClick={playNext}
                        className="text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                        disabled={isStemsLoading}
                    >
                        <SkipForward size={20}/>
                    </button>

                    <button
                        onClick={handleRepeatClick}
                        className={cn("transition-colors relative", repeatMode !== 'OFF' ? "text-violet-400" : "text-slate-400 hover:text-white")}
                    >
                        {repeatMode === 'TRACK' ? <Repeat1 size={16}/> : <Repeat size={16}/>}
                        {repeatMode !== 'OFF' && <span
                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-violet-400 rounded-full"/>}
                    </button>
                </div>

                {/* Progress Slider */}
                <div className="w-full flex items-center gap-3 max-w-md">
                    <span className="text-[10px] text-slate-500 font-mono w-10 text-right">{formatTime(progress)}</span>
                    <div className="relative flex-1 h-1 bg-slate-800 rounded-full group flex items-center">
                        <div className="absolute left-0 h-full bg-violet-500 rounded-full group-hover:bg-violet-400"
                             style={{width: `${duration > 0 ? (progress / duration) * 100 : 0}%`}}/>
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            step={0.1}
                            value={progress}
                            disabled={isStemsLoading}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono w-10">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Interactive Mixer & Volume */}
            <div className="flex items-center justify-end gap-4 w-[30%] relative">
                {stemsError && (
                    <span
                        className="text-[10px] text-red-400 font-medium absolute -top-8 right-0 bg-red-400/10 px-2 py-1 rounded">
                        Sync Failed: Switching to Master
                    </span>
                )}

                {hasStems && (
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 shadow-inner">
                        <button
                            onClick={() => setPlaybackMode('master')}
                            className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", playbackMode === 'master' ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}
                        >
                            MASTER
                        </button>
                        <button
                            onClick={() => setPlaybackMode('stems')}
                            disabled={isStemsLoading}
                            className={cn(
                                "px-2 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1",
                                playbackMode === 'stems' ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300 disabled:opacity-50"
                            )}
                        >
                            {isStemsLoading && <Loader2 size={10} className="animate-spin"/>}
                            STEMS
                        </button>
                    </div>
                )}

                <button
                    onClick={toggleQueue}
                    className={cn("p-2 rounded-lg transition-colors", isQueueOpen ? "text-violet-400" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                >
                    <ListVideo size={20}/>
                </button>

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
                        <div className="absolute left-0 h-full bg-violet-500 rounded-full group-hover:bg-violet-400"
                             style={{width: `${volume * 100}%`}}/>
                        <input type="range" min="0" max="1" step="0.01" value={volume}
                               onChange={(e) => setVolume(parseFloat(e.target.value))}
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                    </div>
                </div>

                {/* Stem Mixer Popover */}
                {isMixerOpen && hasStems && (
                    <div
                        className="absolute bottom-full right-0 mb-4 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-2 z-[60]">
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-widest">
                                <Settings2 size={14} className="text-violet-400"/>
                                Console
                            </div>
                            <button onClick={() => setIsMixerOpen(false)} className="text-slate-500 hover:text-white">
                                <Disc3 size={14} className="animate-spin-slow"/>
                            </button>
                        </div>
                        <div className="space-y-5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {Object.keys(currentTrack.stemsMetadata).map((name) => (
                                <div key={name} className="space-y-2 group/stem">
                                    <div
                                        className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                                        <span
                                            className="text-slate-400 group-hover/stem:text-violet-300 transition-colors">{name}</span>
                                        <span
                                            className="text-slate-500 font-mono">{Math.round((stemVolumes[name] || 0) * 100)}%</span>
                                    </div>
                                    <div className="relative h-1.5 bg-slate-800 rounded-full flex items-center">
                                        <div className="absolute h-full bg-violet-500 rounded-full"
                                             style={{width: `${(stemVolumes[name] || 0) * 100}%`}}/>
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