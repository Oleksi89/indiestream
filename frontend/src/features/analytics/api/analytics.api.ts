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