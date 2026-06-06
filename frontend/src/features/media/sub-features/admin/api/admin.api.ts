import {apiClient} from '@/shared/api/apiClient';
import type {
    PageResponse,
    TrackStatus,
    AdminTrackSummaryDto,
    AdminTrackDetailsDto,
    ModerationVerdictRequest,
    ModerationQueueProjection
} from '../../../types';
import type {AxiosResponse} from 'axios';

export interface AdminRegistryFilters {
    query?: string;
    statuses?: TrackStatus[];
    startDate?: string;
    endDate?: string;
    sort?: string;
    page: number;
    size: number;
}

export const adminApi = {
    getGlobalRegistry: async (filters: AdminRegistryFilters): Promise<PageResponse<AdminTrackSummaryDto>> => {
        // Axios serializes arrays as statuses=BANNED&statuses=IN_REVIEW automatically
        const params = new URLSearchParams();
        if (filters.query) params.append('query', filters.query);
        if (filters.statuses?.length) {
            filters.statuses.forEach(s => params.append('statuses', s));
        }
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.sort) params.append('sort', filters.sort);
        params.append('page', String(filters.page));
        params.append('size', String(filters.size));

        const {data} = await apiClient.get<unknown, AxiosResponse<PageResponse<AdminTrackSummaryDto>>>(
            `/admin/moderation/tracks/registry?${params.toString()}`
        );
        return data;
    },

    getModerationQueue: async (page: number = 0, size: number = 20): Promise<PageResponse<ModerationQueueProjection>> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<PageResponse<ModerationQueueProjection>>>(
            '/admin/moderation/tracks/queue',
            {params: {page, size}}
        );
        return data;
    },

    getTrackDetails: async (trackId: string): Promise<AdminTrackDetailsDto> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<AdminTrackDetailsDto>>(
            `/admin/moderation/tracks/${trackId}`
        );
        return data;
    },

    executeVerdict: async (trackId: string, payload: ModerationVerdictRequest): Promise<void> => {
        await apiClient.post(`/admin/moderation/tracks/${trackId}/verdict`, payload);
    },

    banArtist: async (artistId: string, reason: string): Promise<void> => {
        await apiClient.post(`/admin/moderation/tracks/artists/${artistId}/ban`, null, {
            params: {reason}
        });
    }
};