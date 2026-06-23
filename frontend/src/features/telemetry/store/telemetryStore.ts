import {create} from 'zustand';
import type {TimeRange} from '../types';
import {getTelemetryWorker} from '../lib/workerManager';
import {usePlayerStore} from "@/shared/store/playerStore.ts";

export const generateSafeUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

interface TelemetryState {
    currentTrackId: string | null;
    sessionId: string | null;
    timeRanges: TimeRange[];
    activeRangeStart: number | null;
    lastTrackedProgress: number;

    startTracking: (trackId: string, currentProgressSeconds: number) => void;
    updateProgress: (progressSeconds: number, isPlaying: boolean, volume: number) => void;
    handlePause: (progressSeconds: number) => void;
    handleResume: (progressSeconds: number, volume: number) => void;
    handleVolumeChange: (progressSeconds: number, volume: number) => void;
    flushTelemetry: (keepSession?: boolean) => void;
    flushTelemetryOnPause: () => void;
}


export const useTelemetryStore = create<TelemetryState>((set, get) => ({
    currentTrackId: null,
    sessionId: null,
    timeRanges: [],
    activeRangeStart: null,
    lastTrackedProgress: 0,

    startTracking: (trackId, currentProgressSeconds) => {
        // Hard flush previous track before starting new tracking session
        get().flushTelemetry();

        set({
            currentTrackId: trackId,
            sessionId: generateSafeUUID(),
            timeRanges: [],
            activeRangeStart: null,
            lastTrackedProgress: currentProgressSeconds
        });
    },

    updateProgress: (progressSeconds, isPlaying, volume) => {
        const {lastTrackedProgress, activeRangeStart, timeRanges, currentTrackId, sessionId} = get();
        if (!currentTrackId || !sessionId) return;

        const currentProgressMs = progressSeconds * 1000;
        const lastProgressMs = lastTrackedProgress * 1000;
        const isSeek = Math.abs(progressSeconds - lastTrackedProgress) > 1.5;

        if (isSeek) {
            const updatedRanges = [...timeRanges];
            if (activeRangeStart !== null && volume > 0) {
                updatedRanges.push({startMs: activeRangeStart, endMs: lastProgressMs});
            }
            set({
                timeRanges: updatedRanges,
                activeRangeStart: isPlaying && volume > 0 ? currentProgressMs : null,
                lastTrackedProgress: progressSeconds
            });
            return;
        }

        set({lastTrackedProgress: progressSeconds});

        if (activeRangeStart === null && isPlaying && volume > 0) {
            set({activeRangeStart: currentProgressMs});
        }
    },

    handlePause: (progressSeconds) => {
        const {activeRangeStart, timeRanges, currentTrackId, lastTrackedProgress} = get();
        if (!currentTrackId) return;

        const updatedRanges = [...timeRanges];
        if (activeRangeStart !== null) {
            // If progress dropped to 0 due to natural track end
            // fallback to the last valid tracked progress to prevent segment destruction.
            const safeEndMs = (progressSeconds <= 1 && lastTrackedProgress > 1)
                ? lastTrackedProgress * 1000
                : progressSeconds * 1000;

            updatedRanges.push({startMs: activeRangeStart, endMs: safeEndMs});
        }

        // Just freeze the range.
        set({
            timeRanges: updatedRanges,
            activeRangeStart: null,
            lastTrackedProgress: progressSeconds
        });
    },

    handleResume: (progressSeconds, volume) => {
        const {currentTrackId} = get();
        if (!currentTrackId) return;
        set({
            activeRangeStart: volume > 0 ? progressSeconds * 1000 : null,
            lastTrackedProgress: progressSeconds
        });
    },

    handleVolumeChange: (progressSeconds, volume) => {
        const {activeRangeStart, timeRanges, currentTrackId} = get();
        if (!currentTrackId) return;

        const updatedRanges = [...timeRanges];
        const currentProgressMs = progressSeconds * 1000;

        if (volume === 0 && activeRangeStart !== null) {
            updatedRanges.push({startMs: activeRangeStart, endMs: currentProgressMs});
            set({
                timeRanges: updatedRanges,
                activeRangeStart: null,
                lastTrackedProgress: progressSeconds
            });
        } else if (volume > 0 && activeRangeStart === null) {
            set({
                activeRangeStart: currentProgressMs,
                lastTrackedProgress: progressSeconds
            });
        }
    },

    flushTelemetry: () => {
        const {currentTrackId, sessionId, timeRanges, activeRangeStart, lastTrackedProgress} = get();
        if (!currentTrackId || !sessionId) return;

        const {playbackContext} = usePlayerStore.getState();
        // Mute completely if this is an internal admin/artist playback
        if (playbackContext?.type === 'SYSTEM_INTERNAL') {
            set({
                currentTrackId: null,
                sessionId: null,
                timeRanges: [],
                activeRangeStart: null,
                lastTrackedProgress: 0
            });
            return;
        }

        let finalRanges = [...timeRanges];
        if (activeRangeStart !== null) {
            finalRanges.push({startMs: activeRangeStart, endMs: lastTrackedProgress * 1000});
        }

        finalRanges = finalRanges.filter(r => r.endMs > r.startMs);

        if (finalRanges.length > 0) {
            const playbackDurationMs = finalRanges.reduce((sum, range) => sum + (range.endMs - range.startMs), 0);

            //  Block delivery if duration is under 2000ms (Misclick Guard)
            const MIN_PLAYBACK_DURATION_MS = 2000;

            if (playbackDurationMs >= MIN_PLAYBACK_DURATION_MS) {
                const startPositionMs = Math.min(...finalRanges.map(r => r.startMs));
                const endPositionMs = Math.max(...finalRanges.map(r => r.endMs));

                getTelemetryWorker().postMessage({
                    type: 'ENQUEUE_PLAYBACK',
                    payload: {
                        eventId: generateSafeUUID(),
                        trackId: currentTrackId,
                        sessionId,
                        startPositionMs,
                        endPositionMs,
                        playbackDurationMs,
                        // Fallback to SYSTEM_RECOMMENDATION if context is completely lost
                        sourceType: playbackContext?.type || 'SYSTEM_RECOMMENDATION',
                        sourceId: playbackContext?.id
                    }
                });
            }
        }

        set({
            currentTrackId: null,
            sessionId: null,
            timeRanges: [],
            activeRangeStart: null,
            lastTrackedProgress: 0
        });
    },
}));