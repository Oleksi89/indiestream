import {useEffect, useState, useRef} from 'react';

import {usePlayerStore} from '@/shared/store/playerStore';
import {useAuthStore} from '@/shared/store/authStore';
import {mediaApi} from '../api/media.api';
import {audioEngine} from '../lib/webAudioEngine';
import Hls from "hls.js";


export const useWebAudio = () => {
    const {currentTrack, playbackMode, isPlaying, stemVolumes, volume, setPlaying, setProgress} = usePlayerStore();
    const token = useAuthStore(state => state.token);

    const [isStemsLoading, setIsStemsLoading] = useState(false);
    const [stemsError, setStemsError] = useState<string | null>(null);

    const stemElements = useRef<Map<string, HTMLAudioElement>>(new Map());
    const hlsInstances = useRef<Map<string, Hls>>(new Map());

    // Bootstrap HLS instances for multi-stem synchronization
    useEffect(() => {
        if (playbackMode !== 'stems' || !currentTrack?.stemsMetadata) {
            cleanupStems();
            return;
        }

        const initStems = async () => {
            setIsStemsLoading(true);
            setStemsError(null);
            cleanupStems();

            const stemNames = Object.keys(currentTrack.stemsMetadata);
            let loadedCount = 0;

            const checkReady = () => {
                loadedCount++;
                if (loadedCount === stemNames.length) finalizeSetup();
            };

            stemNames.forEach(name => {
                const audioEl = new Audio();
                audioEl.crossOrigin = 'anonymous'; // Critical for WebAudio API routing
                audioEl.preload = 'auto';
                stemElements.current.set(name, audioEl);

                const streamUrl = mediaApi.getHlsManifestUrl(currentTrack.id, 'stems', name);

                if (Hls.isSupported()) {
                    const hls = new Hls({
                        enableWorker: true,
                        lowLatencyMode: true,
                        // Secure resource fetching: bypasses standard browser CORS restrictions for JWT
                        xhrSetup: (xhr) => {
                            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                        }
                    });

                    hls.loadSource(streamUrl);
                    hls.attachMedia(audioEl);
                    hlsInstances.current.set(name, hls);

                    hls.on(Hls.Events.MANIFEST_PARSED, checkReady);
                    hls.on(Hls.Events.ERROR, (_, data) => {
                        if (data.fatal) {
                            console.error('HLS Fatal Error for stem:', name, data);
                            setStemsError(`Failed to sync stem: ${name}`);
                            setPlaying(false);
                        }
                    });
                } else if (audioEl.canPlayType('application/vnd.apple.mpegurl')) {
                    // Fallback for Safari native HLS.
                    // TODO: [Security] - Implement signed cookies for Safari native JWT support
                    audioEl.src = streamUrl;
                    audioEl.addEventListener('loadedmetadata', checkReady);
                }
            });
        };

        const finalizeSetup = () => {
            audioEngine.connectStems(stemElements.current);
            audioEngine.resumeContext();

            stemElements.current.forEach((_, name) => {
                audioEngine.setStemVolume(name, stemVolumes[name] ?? 0.8);
            });
            audioEngine.setMasterVolume(volume);

            setIsStemsLoading(false);
            if (usePlayerStore.getState().isPlaying) playAllStems();
        };

        initStems();

        return () => cleanupStems();
    }, [currentTrack, playbackMode, token]);

    const cleanupStems = () => {
        audioEngine.disconnectAll();
        audioEngine.suspendContext();
        hlsInstances.current.forEach(hls => hls.destroy());
        hlsInstances.current.clear();
        stemElements.current.forEach(el => {
            el.pause();
            el.removeAttribute('src');
            el.load();
        });
        stemElements.current.clear();
    };

    const playAllStems = () => {
        const offset = usePlayerStore.getState().progress;
        stemElements.current.forEach(el => {
            el.currentTime = offset;
            el.play().catch(e => console.warn('Stem play interrupted:', e));
        });
    };

    const pauseAllStems = () => {
        stemElements.current.forEach(el => el.pause());
    };

    // Transport Synchronization
    useEffect(() => {
        if (playbackMode !== 'stems' || isStemsLoading) return;
        if (isPlaying) {
            playAllStems();
        } else {
            pauseAllStems();
        }
    }, [isPlaying, isStemsLoading, playbackMode]);

    // Timeline Polling (Reads from the first available HTML5 element)
    useEffect(() => {
        if (playbackMode !== 'stems' || !isPlaying || isStemsLoading) return;

        const intervalId = setInterval(() => {
            const firstStem = Array.from(stemElements.current.values())[0];
            if (!firstStem) return;

            const time = firstStem.currentTime;
            const duration = usePlayerStore.getState().duration;

            // Auto-stop at the end of the track
            if (duration > 0 && time >= duration) {
                setProgress(duration);
                setPlaying(false);
            } else {
                setProgress(time);
            }
        }, 250); // 250ms standard tick rate for media players to balance precision and CPU load

        return () => clearInterval(intervalId);
    }, [isPlaying, playbackMode, isStemsLoading, setProgress, setPlaying]);

    // Mixer Synchronization
    useEffect(() => {
        if (playbackMode !== 'stems') return;
        Object.entries(stemVolumes).forEach(([name, vol]) => audioEngine.setStemVolume(name, vol));
    }, [stemVolumes, playbackMode]);

    useEffect(() => {
        if (playbackMode === 'stems') audioEngine.setMasterVolume(volume);
    }, [volume, playbackMode]);

    return {
        isStemsLoading,
        stemsError,
        seekStems: (time: number) => {
            stemElements.current.forEach(el => el.currentTime = time);
        }
    };
};