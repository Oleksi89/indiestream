import {apiClient} from '@/shared/api/apiClient.ts';
import type {
    ArtistOverviewDto,
    TrackAnalyticsResponseDto,
    SummaryMetricsDto,
    AnalyticsTimeRange,
    ListeningHistoryItemDto
} from '../types';

export const analyticsApi = {
    getArtistOverview: async (timeRange: AnalyticsTimeRange): Promise<ArtistOverviewDto> => {
        const {data} = await apiClient.get<ArtistOverviewDto>('/analytics/artist/overview', {
            params: {timeRange}
        });
        return data;
    },

    getTrackAnalytics: async (trackId: string, timeRange: AnalyticsTimeRange): Promise<TrackAnalyticsResponseDto> => {
        const {data} = await apiClient.get<TrackAnalyticsResponseDto>(`/analytics/artist/tracks/${trackId}`, {
            params: {timeRange}
        });
        return data;
    },

    exportTrackCsv: async (trackId: string, timeRange: AnalyticsTimeRange): Promise<Blob> => {
        const {data} = await apiClient.get(`/analytics/artist/tracks/${trackId}/export`, {
            params: {timeRange},
            responseType: 'blob' // Critical for file downloads
        });
        return data;
    },

    getCuratorPlaylistAnalytics: async (playlistId: string, timeRange: AnalyticsTimeRange): Promise<SummaryMetricsDto> => {
        const {data} = await apiClient.get<SummaryMetricsDto>(`/analytics/curator/playlists/${playlistId}`, {
            params: {timeRange}
        });
        return data;
    },

    getPlatformOverview: async (timeRange: AnalyticsTimeRange): Promise<SummaryMetricsDto> => {
        const {data} = await apiClient.get<SummaryMetricsDto>('/analytics/admin/platform', {
            params: {timeRange}
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