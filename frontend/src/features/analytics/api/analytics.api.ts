import {apiClient} from '@/shared/api/apiClient.ts';
import type {
    ArtistOverviewDto,
    TrackAnalyticsResponseDto,
    PlaylistOverviewDto,
    PlatformOverviewDto,
    ListeningHistoryItemDto
} from '../types';

export const analyticsApi = {
    getArtistOverview: async (startDate: string, endDate: string): Promise<ArtistOverviewDto> => {
        const {data} = await apiClient.get<ArtistOverviewDto>('/analytics/artist/overview', {
            params: {startDate, endDate}
        });
        return data;
    },

    getTrackAnalytics: async (trackId: string, startDate: string, endDate: string): Promise<TrackAnalyticsResponseDto> => {
        const {data} = await apiClient.get<TrackAnalyticsResponseDto>(`/analytics/artist/tracks/${trackId}`, {
            params: {startDate, endDate}
        });
        return data;
    },

    exportTrackCsv: async (trackId: string, startDate: string, endDate: string): Promise<Blob> => {
        const {data} = await apiClient.get(`/analytics/artist/tracks/${trackId}/export`, {
            params: {startDate, endDate},
            responseType: 'blob'
        });
        return data;
    },

    getCuratorPlaylistAnalytics: async (playlistId: string, startDate: string, endDate: string): Promise<PlaylistOverviewDto> => {
        const {data} = await apiClient.get<PlaylistOverviewDto>(`/analytics/curator/playlists/${playlistId}`, {
            params: {startDate, endDate}
        });
        return data;
    },

    getPlatformOverview: async (startDate: string, endDate: string): Promise<PlatformOverviewDto> => {
        const {data} = await apiClient.get<PlatformOverviewDto>('/analytics/admin/platform', {
            params: {startDate, endDate}
        });
        return data;
    },

    getListeningHistory: async (page: number = 0, size: number = 20): Promise<{
        content: ListeningHistoryItemDto[],
        totalPages: number
    }> => {
        const {data} = await apiClient.get('/analytics/me/history', {
            params: {page, size}
        });
        return data;
    }
};


export const telemetryAdminApi = {
    forceHourlyRollup: async (start?: string, end?: string): Promise<unknown> => {
        const params = new URLSearchParams();
        if (start) params.append('start', start);
        if (end) params.append('end', end);
        const {data} = await apiClient.post(`/admin/telemetry/rollup/hourly/force?${params.toString()}`);
        return data;
    },

    forceDailyRollup: async (start?: string, end?: string): Promise<string> => {
        const params = new URLSearchParams();
        if (start) params.append('start', start);
        if (end) params.append('end', end);
        const {data} = await apiClient.post(`/admin/telemetry/rollup/daily/force?${params.toString()}`);
        return data;
    },

    syncTotals: async (): Promise<string> => {
        const {data} = await apiClient.post('/admin/telemetry/sync-totals');
        return data;
    },

    triggerSemanticReindex: async (): Promise<{ status: string; message: string }> => {
        const {data} = await apiClient.post('/admin/recommendations/reindex', {all: true});
        return data;
    }
};