import {create} from 'zustand';
import type {TrackDto} from '@/features/media/types';

interface PlayerState {
    currentTrack: TrackDto | null;
    isPlaying: boolean;
    volume: number;
    progress: number; // In seconds
    duration: number; // In seconds
    queue: TrackDto[];

    // Actions
    setTrack: (track: TrackDto) => void;
    togglePlay: () => void;
    setPlaying: (isPlaying: boolean) => void;
    setVolume: (volume: number) => void;
    setProgress: (progress: number) => void;
    setDuration: (duration: number) => void;
    addToQueue: (track: TrackDto) => void;
    nextTrack: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
    currentTrack: null,
    isPlaying: false,
    volume: 0.7, // 70% default volume
    progress: 0,
    duration: 0,
    queue: [],

    setTrack: (track) => set({
        currentTrack: track,
        isPlaying: true,
        progress: 0
    }),

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
            set({
                currentTrack: next,
                queue: queue.slice(1),
                isPlaying: true,
                progress: 0
            });
        }
    }
}));