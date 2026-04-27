import {create} from 'zustand';
import type {TrackDto} from '@/features/media/types';

export type PlaybackMode = 'master' | 'stems';

interface PlayerState {
    currentTrack: TrackDto | null;
    isPlaying: boolean;
    volume: number; // Global master volume (0.0 to 1.0)
    progress: number; // In seconds
    duration: number; // In seconds
    queue: TrackDto[];

    // Stems state
    playbackMode: PlaybackMode;
    stemVolumes: Record<string, number>; // Map of stem name to volume (0.0 to 1.0)

    // Actions
    setTrack: (track: TrackDto) => void;
    togglePlay: () => void;
    setPlaying: (isPlaying: boolean) => void;
    setVolume: (volume: number) => void;
    setProgress: (progress: number) => void;
    setDuration: (duration: number) => void;
    addToQueue: (track: TrackDto) => void;
    nextTrack: () => void;

    // Stems actions
    setPlaybackMode: (mode: PlaybackMode) => void;
    setStemVolume: (stemName: string, volume: number) => void;
    initializeStems: (stemsMetadata: Record<string, string>) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
    currentTrack: null,
    isPlaying: false,
    volume: 0.7, // 70% default volume
    progress: 0,
    duration: 0,
    queue: [],

    playbackMode: 'master',
    stemVolumes: {},

    setTrack: (track) => {
        set({
            currentTrack: track,
            isPlaying: true,
            progress: 0,
            playbackMode: 'master' // Always default to master on new track for performance
        });

        // Auto-initialize stem volumes if available
        if (track.stemsMetadata && Object.keys(track.stemsMetadata).length > 0) {
            get().initializeStems(track.stemsMetadata);
        } else {
            set({stemVolumes: {}});
        }
    },

    togglePlay: () => set((state) => ({isPlaying: !state.isPlaying})),

    setPlaying: (isPlaying) => set({isPlaying}),

    setVolume: (volume) => set({volume}),

    setProgress: (progress) => set({progress}),

    setDuration: (duration) => set({duration}),

    addToQueue: (track) => set((state) => ({
        queue: [...state.queue, track]
    })),

    nextTrack: () => {
        const {queue} = get();
        if (queue.length > 0) {
            const next = queue[0];
            get().setTrack(next); // Reuse setTrack to ensure stems are initialized
            set({queue: queue.slice(1)});
        }
    },

    setPlaybackMode: (mode) => set({playbackMode: mode}),

    setStemVolume: (stemName, volume) => set((state) => ({
        stemVolumes: {
            ...state.stemVolumes,
            [stemName]: volume
        }
    })),

    initializeStems: (stemsMetadata) => {
        const initialVolumes: Record<string, number> = {};
        // Default all stems to 80% volume initially
        Object.keys(stemsMetadata).forEach(stem => {
            initialVolumes[stem] = 0.8;
        });
        set({stemVolumes: initialVolumes});
    }
}));