import {useEffect, useState} from 'react';
import {usePlayerStore} from '@/shared/store/playerStore';
import {mediaApi} from '../api/media.api';
import {audioEngine} from '../lib/webAudioEngine';

export const useWebAudio = () => {
    const {currentTrack, playbackMode, isPlaying, stemVolumes, volume, setPlaying} = usePlayerStore();
    const [isStemsLoading, setIsStemsLoading] = useState(false);
    const [stemsError, setStemsError] = useState<string | null>(null);

    useEffect(() => {
        // Guard: Only initialize graph if stems mode is explicitly requested
        if (playbackMode !== 'stems' || !currentTrack || !currentTrack.stemsMetadata) {
            audioEngine.stop();
            return;
        }

        let isCancelled = false;

        const loadAndPlayStems = async () => {
            setIsStemsLoading(true);
            setStemsError(null);

            try {
                const stemNames = Object.keys(currentTrack.stemsMetadata);

                // Fetch all raw binary files concurrently
                const fetchPromises = stemNames.map(async (name) => {
                    const blob = await mediaApi.getStemAudioBlob(currentTrack.id, name);
                    const arrayBuffer = await blob.arrayBuffer();
                    return {name, arrayBuffer};
                });

                const results = await Promise.all(fetchPromises);
                if (isCancelled) return;

                const stemsMap = new Map<string, ArrayBuffer>();
                results.forEach(res => stemsMap.set(res.name, res.arrayBuffer));

                await audioEngine.loadStems(stemsMap);

                if (isCancelled) return;

                // Sync initial states from Zustand
                stemNames.forEach(name => {
                    const vol = stemVolumes[name] ?? 0.8;
                    audioEngine.setStemVolume(name, vol);
                });
                audioEngine.setMasterVolume(volume);

                if (isPlaying) {
                    audioEngine.play(usePlayerStore.getState().progress);
                }
            } catch (error) {
                if (!isCancelled) {
                    // TODO: [Media] - Dispatch error to global toast notification system (RFC 7807 UI equivalent)
                    console.error('Failed to load stems into Web Audio context:', error);
                    setStemsError('Failed to synchronize stems due to a network or decoding error.');
                    setPlaying(false);
                }
            } finally {
                if (!isCancelled) setIsStemsLoading(false);
            }
        };

        loadAndPlayStems();

        return () => {
            isCancelled = true;
            audioEngine.stop();
        };
    }, [currentTrack, playbackMode]); // Intentionally skipping isPlaying to prevent re-fetching

    // Sync play/pause state without rebuilding the graph
    useEffect(() => {
        if (playbackMode !== 'stems') return;

        if (isPlaying && !isStemsLoading) {
            audioEngine.play(usePlayerStore.getState().progress);
        } else {
            audioEngine.pause();
        }
    }, [isPlaying, isStemsLoading, playbackMode]);

    // Sync individual stem volumes in real-time
    useEffect(() => {
        if (playbackMode !== 'stems') return;
        Object.entries(stemVolumes).forEach(([name, vol]) => {
            audioEngine.setStemVolume(name, vol);
        });
    }, [stemVolumes, playbackMode]);

    // Sync master volume
    useEffect(() => {
        if (playbackMode === 'stems') {
            audioEngine.setMasterVolume(volume);
        }
    }, [volume, playbackMode]);

    return {isStemsLoading, stemsError};
};