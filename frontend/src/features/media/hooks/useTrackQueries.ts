import {useQuery} from '@tanstack/react-query';
import {mediaApi} from '../api/media.api';
import type {TrackDto} from "@/features/media/types";

export const trackKeys = {
    all: ['tracks'] as const,
    studio: () => [...trackKeys.all, 'studio'] as const,
    detail: (trackId: string) => [...trackKeys.all, 'detail', trackId] as const,
};

/**
 * Fetches the artist's own tracks.
 */
export const useStudioTracks = (page: number = 0, size: number = 20) => {
    return useQuery({
        queryKey: [...trackKeys.studio(), page, size],
        queryFn: () => mediaApi.getStudioTracks(page, size),
    });
};

/**
 * Polls a specific track's status. Used by the final step of the Upload Wizard.
 */
export const useTrackStatusPoll = (trackId: string | null) => {
    return useQuery<TrackDto, Error>({
        queryKey: trackKeys.detail(trackId!),
        queryFn: () => mediaApi.getTrack(trackId!),
        enabled: !!trackId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            const isTerminal = status && !['PROCESSING', 'AI_ANALYSIS'].includes(status);
            return isTerminal ? false : 3000;
        }
    });
};