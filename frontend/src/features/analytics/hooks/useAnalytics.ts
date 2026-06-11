import {useQuery, useMutation} from '@tanstack/react-query';
import {analyticsApi} from '../api/analytics.api.ts';
import type {AnalyticsTimeRange} from '../types';

// Query Key Factory (Best Practice for TanStack Query v5)
export const analyticsKeys = {
    all: ['analytics'] as const,
    artistOverview: (timeRange: AnalyticsTimeRange) => [...analyticsKeys.all, 'artist', 'overview', timeRange] as const,
    trackDetails: (trackId: string, timeRange: AnalyticsTimeRange) => [...analyticsKeys.all, 'track', trackId, timeRange] as const,
    curatorPlaylist: (playlistId: string, timeRange: AnalyticsTimeRange) => [...analyticsKeys.all, 'curator', playlistId, timeRange] as const,
    adminPlatform: (timeRange: AnalyticsTimeRange) => [...analyticsKeys.all, 'admin', 'platform', timeRange] as const,
    listeningHistory: (page: number) => [...analyticsKeys.all, 'history', page] as const,
};

export const useArtistOverview = (timeRange: AnalyticsTimeRange) => {
    return useQuery({
        queryKey: analyticsKeys.artistOverview(timeRange),
        queryFn: () => analyticsApi.getArtistOverview(timeRange),
        staleTime: 5 * 60 * 1000, // 5 minutes fresh
    });
};

export const useTrackAnalytics = (trackId: string | undefined, timeRange: AnalyticsTimeRange) => {
    return useQuery({
        queryKey: analyticsKeys.trackDetails(trackId!, timeRange),
        queryFn: () => analyticsApi.getTrackAnalytics(trackId!, timeRange),
        enabled: !!trackId,
        staleTime: 60 * 1000, // 1 minute (due to real-time concurrent listeners)
    });
};

export const useCuratorAnalytics = (playlistId: string | undefined, timeRange: AnalyticsTimeRange) => {
    return useQuery({
        queryKey: analyticsKeys.curatorPlaylist(playlistId!, timeRange),
        queryFn: () => analyticsApi.getCuratorPlaylistAnalytics(playlistId!, timeRange),
        enabled: !!playlistId,
    });
};

export const usePlatformAnalytics = (timeRange: AnalyticsTimeRange) => {
    return useQuery({
        queryKey: analyticsKeys.adminPlatform(timeRange),
        queryFn: () => analyticsApi.getPlatformOverview(timeRange),
        staleTime: 10 * 60 * 1000,
    });
};

export const useExportTrackCsv = () => {
    return useMutation({
        mutationFn: ({trackId, timeRange}: { trackId: string, timeRange: AnalyticsTimeRange }) =>
            analyticsApi.exportTrackCsv(trackId, timeRange),
        onSuccess: (blob, variables) => {
            // Create a temporary link to trigger the browser's download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `track_analytics_${variables.trackId}_${variables.timeRange}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        }
    });
};

export const useListeningHistory = (page: number) => {
    return useQuery({
        queryKey: analyticsKeys.listeningHistory(page),
        queryFn: () => analyticsApi.getListeningHistory(page),
        staleTime: 2 * 60 * 1000,
    });
};