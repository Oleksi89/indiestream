import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import type {TrackDto} from '@/features/media/types';
import type {TelemetrySourceType} from '@/features/telemetry/types';
import type {AutoplayMode} from "@/features/recommendations/types";

export type PlaybackMode = 'master' | 'stems';
export type RepeatMode = 'OFF' | 'CONTEXT' | 'TRACK';

// Structured Context for AI Vector weight tracking
export interface PlaybackContext {
    type: TelemetrySourceType;
    id?: string;
}

interface PlayerState {
    // Media State
    currentTrack: TrackDto | null;
    isPlaying: boolean;
    volume: number;
    progress: number;
    duration: number;

    queue: TrackDto[];
    originalQueue: TrackDto[];
    history: TrackDto[];
    playbackContext: PlaybackContext | null;
    isShuffle: boolean;
    repeatMode: RepeatMode;
    isQueueOpen: boolean;

    playbackMode: PlaybackMode;
    stemVolumes: Record<string, number>;

    // Actions
    setTrack: (track: TrackDto, context?: PlaybackContext) => void;
    playContext: (tracks: TrackDto[], context: PlaybackContext, startIndex?: number) => void;
    togglePlay: () => void;
    setPlaying: (isPlaying: boolean) => void;
    setVolume: (volume: number) => void;
    setProgress: (progress: number) => void;
    setDuration: (duration: number) => void;

    // Queue Actions
    addToQueue: (track: TrackDto) => void;
    addContextToQueue: (tracks: TrackDto[]) => void;
    playNext: () => void;
    playPrevious: () => void;
    toggleShuffle: () => void;
    setRepeatMode: (mode: RepeatMode) => void;
    toggleQueue: () => void;
    reorderQueue: (startIndex: number, endIndex: number) => void;

    // Stems Actions
    setPlaybackMode: (mode: PlaybackMode) => void;
    setStemVolume: (stemName: string, volume: number) => void;
    initializeStems: (stemsMetadata: Record<string, string>) => void;

    // Autoplay Engine State
    isAutoplayActive: boolean;
    autoplayMode: AutoplayMode | null;
    autoplayContextId: string | null;

    // Autoplay Actions
    setAutoplay: (isActive: boolean, mode?: AutoplayMode | null, contextId?: string | null) => void;
    appendAutoplayTracks: (tracks: TrackDto[]) => void;
}

// Fisher-Yates Shuffle O(n)
const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set, get) => ({
            currentTrack: null,
            isPlaying: false,
            volume: 0.7,
            progress: 0,
            duration: 0,

            queue: [],
            originalQueue: [],
            history: [],
            playbackContext: null,
            isShuffle: false,
            repeatMode: 'OFF',
            isQueueOpen: false,

            isAutoplayActive: true, // Default to continuous playback for better UX
            autoplayMode: 'TASTE',  // Default to general taste profiling
            autoplayContextId: null,

            playbackMode: 'master',
            stemVolumes: {},

            setTrack: (track, context) => {
                const {currentTrack, playbackContext} = get();
                if (currentTrack) {
                    set((state) => ({history: [...state.history, currentTrack]}));
                }

                set({
                    currentTrack: track,
                    isPlaying: true,
                    progress: 0,
                    playbackMode: 'master', // Always default to master on new track for performance
                    // Update context only if explicitly provided, else retain current context
                    playbackContext: context !== undefined ? context : playbackContext
                });

                if (track.stemsMetadata && Object.keys(track.stemsMetadata).length > 0) {
                    get().initializeStems(track.stemsMetadata);
                } else {
                    set({stemVolumes: {}});
                }
            },

            playContext: (tracks, context, startIndex = 0) => {
                if (tracks.length === 0) return;

                const trackToPlay = tracks[startIndex];
                const initialQueue = tracks.slice(startIndex + 1);

                set({
                    originalQueue: tracks,
                    playbackContext: context,
                    history: [],
                    isShuffle: false // Reset shuffle on new context
                });

                set({queue: initialQueue});
                get().setTrack(trackToPlay);
            },

            togglePlay: () => set((state) => ({isPlaying: !state.isPlaying})),
            setPlaying: (isPlaying) => set({isPlaying}),
            setVolume: (volume) => set({volume}),
            setProgress: (progress) => set({progress}),
            setDuration: (duration) => set({duration}),

            addToQueue: (track) => set((state) => ({
                queue: [track, ...state.queue]
            })),


            /**
             * Appends an entire array of tracks to the END of the current queue.
             * Filters out duplicates if they already exist in the upcoming queue.
             */
            addContextToQueue: (tracks) => set((state) => {
                const existingIds = new Set(state.queue.map(t => t.id));
                const newTracks = tracks.filter(t => !existingIds.has(t.id));
                return {queue: [...state.queue, ...newTracks]};
            }),

            reorderQueue: (startIndex, endIndex) => set((state) => {
                const newQueue = Array.from(state.queue);
                const [removed] = newQueue.splice(startIndex, 1);
                newQueue.splice(endIndex, 0, removed);
                return {queue: newQueue};
            }),

            playNext: () => {
                const {queue, originalQueue, repeatMode, isShuffle, currentTrack} = get();

                if (repeatMode === 'TRACK' && currentTrack) {
                    set({progress: 0, isPlaying: true});
                    return;
                }

                if (queue.length > 0) {
                    const next = queue[0];
                    const newQueue = queue.slice(1);
                    set({queue: newQueue});
                    get().setTrack(next);
                } else if (repeatMode === 'CONTEXT' && originalQueue.length > 0) {
                    // Loop context
                    const tracksToPlay = isShuffle ? shuffleArray(originalQueue) : originalQueue;
                    const next = tracksToPlay[0];
                    set({
                        queue: tracksToPlay.slice(1),
                        history: []
                    });
                    get().setTrack(next);
                } else {
                    // End of playback
                    set({isPlaying: false, progress: 0});
                }
            },

            playPrevious: () => {
                const {progress, history, currentTrack} = get();

                if (progress > 3 || history.length === 0) {
                    set({progress: 0, isPlaying: true});
                    return;
                }

                const prev = history[history.length - 1];
                const newHistory = history.slice(0, -1);

                set((state) => ({
                    history: newHistory,
                    queue: currentTrack ? [currentTrack, ...state.queue] : state.queue
                }));

                get().setTrack(prev);
                // Remove the duplicate history push caused by setTrack
                set({history: newHistory});
            },

            toggleShuffle: () => {
                const {isShuffle, queue, originalQueue, currentTrack} = get();
                const newShuffleState = !isShuffle;

                if (newShuffleState) {
                    set({queue: shuffleArray(queue), isShuffle: true});
                } else {
                    // Restore queue from original order
                    if (!currentTrack) {
                        set({queue: originalQueue, isShuffle: false});
                        return;
                    }
                    const currentIndex = originalQueue.findIndex(t => t.id === currentTrack.id);
                    if (currentIndex !== -1) {
                        set({queue: originalQueue.slice(currentIndex + 1), isShuffle: false});
                    } else {
                        set({isShuffle: false});
                    }
                }
            },

            setRepeatMode: (mode) => set({repeatMode: mode}),
            toggleQueue: () => set((state) => ({isQueueOpen: !state.isQueueOpen})),
            setPlaybackMode: (mode) => set({playbackMode: mode}),
            setStemVolume: (stemName, volume) => set((state) => ({
                stemVolumes: {...state.stemVolumes, [stemName]: volume}
            })),

            initializeStems: (stemsMetadata) => {
                const initialVolumes: Record<string, number> = {};
                // Default all stems to 80% volume initially
                Object.keys(stemsMetadata).forEach(stem => {
                    initialVolumes[stem] = 0.8;
                });
                set({stemVolumes: initialVolumes});
            },

            setAutoplay: (isActive, mode = null, contextId = null) => set({
                isAutoplayActive: isActive,
                autoplayMode: mode,
                autoplayContextId: contextId
            }),

            appendAutoplayTracks: (newTracks) => set((state) => {
                // Strict FSD filtering to prevent duplicate playback in the continuous session
                const existingIds = new Set([
                    ...state.history.map(t => t.id),
                    ...state.queue.map(t => t.id),
                    ...(state.currentTrack ? [state.currentTrack.id] : [])
                ]);

                const uniqueNewTracks = newTracks.filter(t => !existingIds.has(t.id));

                return {queue: [...state.queue, ...uniqueNewTracks]};
            }),
        }),
        {
            name: 'indiestream-player-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                currentTrack: state.currentTrack,
                progress: state.progress,
                volume: state.volume,
                queue: state.queue,
                originalQueue: state.originalQueue,
                history: state.history,
                playbackContext: state.playbackContext,
                isShuffle: state.isShuffle,
                repeatMode: state.repeatMode,
                stemVolumes: state.stemVolumes,

                isAutoplayActive: state.isAutoplayActive,
                autoplayMode: state.autoplayMode,
                autoplayContextId: state.autoplayContextId
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isPlaying = false; // Prevent DOMException on autoplay
                    state.playbackMode = 'master'; // Reset engine state
                }
            }
        }
    )
);