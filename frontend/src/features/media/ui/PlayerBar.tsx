import {useEffect, useRef, useState} from 'react';
import {usePlayerStore} from '@/shared/store/playerStore';
import {useAuthStore} from '@/shared/store/authStore';
import {mediaApi} from '../api/media.api';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {useWebAudio} from '../hooks/useWebAudio';
import {Play, Pause, SkipForward, Volume2, Disc3, Settings2, Loader2, Heart, PlusCircle} from 'lucide-react';
import {cn} from '@/shared/lib/utils';
import {audioEngine} from "@/features/media/lib/webAudioEngine.ts";
import Hls from "hls.js";
import {useToggleLike} from "@/features/playlist/hooks/usePlaylists.ts";

/**
 * Global Player Bar Component.
 * Manages dual-engine playback: hls.js standard streaming for Master
 * and synchronized hls.js + Web Audio API routing for Stems.
 */
export const PlayerBar = () => {
    const {
        currentTrack, isPlaying, togglePlay, volume, setVolume,
        progress, setProgress, duration, setDuration, setPlaying,
        playbackMode, setPlaybackMode, stemVolumes, setStemVolume
    } = usePlayerStore();

    const token = useAuthStore(state => state.token);
    const [isMixerOpen, setIsMixerOpen] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const masterHlsRef = useRef<Hls | null>(null);

    // Orchestrate Web Audio API life-cycle
    const {isStemsLoading, stemsError, seekStems} = useWebAudio();

    const hasStems = currentTrack?.stemsMetadata && Object.keys(currentTrack.stemsMetadata).length > 0;

    // Securely fetch cover image
    const {url: coverUrl} = useSecureUrl(
        `cover-player-${currentTrack?.id}`,
        () => mediaApi.getTrackCoverBlob(currentTrack!.id),
        !!currentTrack?.coverMinioPath
    );

    const toggleLike = useToggleLike();

    // TODO: [Playlist] - Resolve real `isLiked` state using cache query or TrackMetadata
    const [isLiked, setIsLiked] = useState(false);

    const handleLike = () => {
        if (!currentTrack) return;
        toggleLike.mutate({trackId: currentTrack.id, isLiked}, {
            onSuccess: () => setIsLiked(!isLiked)
        });
    };

    const handleAddToPlaylist = () => {
        // TODO: [Playlist] - Open AddToPlaylistModal
        console.log("Open add to playlist modal");
    };

    // Init HLS for Master Track
    useEffect(() => {
        if (!audioRef.current || !currentTrack || playbackMode !== 'master') return;

        if (masterHlsRef.current) {
            masterHlsRef.current.destroy();
            masterHlsRef.current = null;
        }

        const masterUrl = mediaApi.getHlsManifestUrl(currentTrack.id, 'master');

        if (Hls.isSupported()) {
            const hls = new Hls({
                xhrSetup: (xhr) => {
                    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
            });
            hls.loadSource(masterUrl);
            hls.attachMedia(audioRef.current);
            masterHlsRef.current = hls;

            hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) console.error("Master HLS Error", data);
            });
        } else if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            audioRef.current.src = masterUrl;
        }

        return () => {
            if (masterHlsRef.current) {
                masterHlsRef.current.destroy();
            }
        };
    }, [currentTrack, playbackMode, token]);

    // Sync HTML5 Audio (Master Mode)
    useEffect(() => {
        if (!audioRef.current) return;

        // Explicitly pause HTML5 audio if mode switches to stems
        if (playbackMode === 'stems') {
            audioRef.current.pause();
            return;
        }

        if (isPlaying) {
            audioRef.current.play().catch(() => setPlaying(false));
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, playbackMode, setPlaying]);

    // Volume synchronization for Master Engine
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume;
    }, [volume]);

    /**
     * Handle seeking across both engines.
     * Prevents desynchronization by strictly routing the seek offset to the active engine.
     */
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

    if (!currentTrack) return null;

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
                onEnded={() => setPlaying(false)}
                className="hidden"
            />

            {/* Track Info & Status */}
            <div className="flex items-center gap-4 w-[25%]">
                <div
                    className="relative h-14 w-14 rounded-lg bg-slate-800 overflow-hidden border border-slate-700 shrink-0">
                    {coverUrl ? (
                        <img src={coverUrl} alt={currentTrack.title} className="h-full w-full object-cover"/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Disc3 className="text-slate-600"/>
                        </div>
                    )}
                    {isStemsLoading && (
                        <div
                            className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[2px]">
                            <Loader2 className="text-violet-400 animate-spin" size={20}/>
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
                            {isStemsLoading ? 'Syncing Stems...' : playbackMode === 'stems' ? 'Multi-Stem Mode' : 'Master Track'}
                        </span>
                    </div>
                </div>

                {/* Engagement Actions injected here */}
                <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity shrink-0">
                    <button
                        onClick={handleLike}
                        className={cn("p-2 rounded-full hover:bg-slate-800 transition-colors", isLiked ? "text-violet-400" : "text-slate-400 hover:text-white")}
                    >
                        <Heart size={18} className={cn(isLiked && "fill-current")}/>
                    </button>
                    <button
                        onClick={handleAddToPlaylist}
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <PlusCircle size={18}/>
                    </button>
                </div>
            </div>

            {/* Main Controls */}
            <div className="flex flex-col items-center gap-2 w-[45%]">
                <div className="flex items-center gap-6">
                    <button className="text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                            disabled={isStemsLoading}>
                        <SkipForward className="rotate-180" size={20}/>
                    </button>
                    <button
                        onClick={togglePlay}
                        disabled={isStemsLoading}
                        className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform disabled:bg-slate-700 disabled:scale-100"
                    >
                        {isStemsLoading ? <Loader2 className="animate-spin" size={20}/> : isPlaying ?
                            <Pause size={20} fill="black"/> : <Play size={20} fill="black" className="ml-1"/>}
                    </button>
                    <button className="text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                            disabled={isStemsLoading}>
                        <SkipForward size={20}/>
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