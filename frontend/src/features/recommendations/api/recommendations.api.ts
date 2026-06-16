import {apiClient} from '@/shared/api/apiClient';
import type {AutoplayMode, DiscoveryShelvesDto} from '../types';
import type {TrackDto} from '@/features/media/types';

/**
 * Axios API client bindings for the Recommendation Backend Module.
 */
export const recommendationsApi = {
    /**
     * Retrieves personalized dashboard shelves generated via pgvector Cosine Distances.
     */
    getDiscoveryShelves: async (): Promise<DiscoveryShelvesDto> => {
        const {data} = await apiClient.get<DiscoveryShelvesDto>('/recommendations/shelves');
        return data;
    },

    /**
     * Generates a continuous playback queue based on vector proximity.
     */
    getAutoplayQueue: async (mode: AutoplayMode, contextId?: string): Promise<TrackDto[]> => {
        const {data} = await apiClient.get<TrackDto[]>('/recommendations/autoplay', {
            params: {mode, contextId}
        });
        return data;
    },

    /**
     * Registers a negative user interaction to shift the Exponential Moving Average (EMA) Taste Vector.
     */
    markNotInterested: async (trackId: string): Promise<void> => {
        await apiClient.post(`/recommendations/interactions/not-interested/${trackId}`);
    },

    /**
     * Danger Zone: Resets the user's taste profile to a Cold Start state.
     */
    resetTasteProfile: async (): Promise<void> => {
        await apiClient.delete('/recommendations/taste/reset');
    }
};