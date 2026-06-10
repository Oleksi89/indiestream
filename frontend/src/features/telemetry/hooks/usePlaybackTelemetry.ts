import {useEffect} from 'react';
import {usePlayerStore} from '@/shared/store/playerStore';
import {useTelemetryStore} from '../store/telemetryStore';

/**
 * Global engine lifecycle bridge hook.
 * Monitors operational player state updates entirely out of the React rendering loop.
 */
export const usePlaybackTelemetry = () => {
    useEffect(() => {
        const initialPlayer = usePlayerStore.getState();
        const telemetry = useTelemetryStore.getState();

        // Account for active states during mid-lifecycle hook registration
        if (initialPlayer.currentTrack) {
            telemetry.startTracking(initialPlayer.currentTrack.id, initialPlayer.progress);
        }

        // Closure snapshots to preserve state differential checking matrix
        let prevTrackId = initialPlayer.currentTrack?.id || null;
        let prevIsPlaying = initialPlayer.isPlaying;
        let prevVolume = initialPlayer.volume;
        let prevProgress = initialPlayer.progress;

        const unsubscribe = usePlayerStore.subscribe((state) => {
            const tel = useTelemetryStore.getState();
            const currentTrackId = state.currentTrack?.id || null;

            // Trigger 1: Core Track Change
            if (currentTrackId !== prevTrackId) {
                // If the track completed naturally, state.progress was reset to 0.
                // force-close the time range using the final known progress BEFORE flushing.
                if (state.progress === 0 && prevProgress > 1) {
                    tel.handlePause(prevProgress);
                }

                // Hard clear old track context completely on dynamic track skip operation
                tel.flushTelemetry();
                if (state.currentTrack) {
                    tel.startTracking(state.currentTrack.id, state.progress);
                }
                prevTrackId = currentTrackId;
                prevIsPlaying = state.isPlaying;
                prevVolume = state.volume;
                prevProgress = state.progress;
                return;
            }

            if (!state.currentTrack) return;

            // Trigger 2: Natural Queue End (Player stopped and reset to 0)
            if (!state.isPlaying && prevIsPlaying && state.progress === 0 && prevProgress > 1) {
                // The queue has ended. Capture the final segment and flush permanently.
                tel.handlePause(prevProgress);
                tel.flushTelemetry();

                prevIsPlaying = state.isPlaying;
                prevProgress = state.progress;
                return;
            }

            // Trigger 3: Playback State Modification
            if (state.isPlaying !== prevIsPlaying) {
                if (state.isPlaying) {
                    tel.handleResume(state.progress, state.volume);
                } else {
                    tel.handlePause(state.progress);
                }
                prevIsPlaying = state.isPlaying;
                prevProgress = state.progress;
                return;
            }

            // Trigger 4: Audio Level Boundary Adjustments
            if (state.volume !== prevVolume) {
                tel.handleVolumeChange(state.progress, state.volume);
                prevVolume = state.volume;
                prevProgress = state.progress;
                return;
            }

            // Trigger 5: Linear Progression Timeline Tick
            if (state.progress !== prevProgress && state.isPlaying) {
                tel.updateProgress(state.progress, state.isPlaying, state.volume);
                prevProgress = state.progress;
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);
};