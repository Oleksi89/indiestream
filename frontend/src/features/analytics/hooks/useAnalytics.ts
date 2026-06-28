import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {analyticsApi, telemetryAdminApi} from '../api/analytics.api.ts';

// Query Key Factory
export const analyticsKeys = {
    all: ['analytics'] as const,
    artistOverview: (startDate: string, endDate: string) => [...analyticsKeys.all, 'artist', 'overview', startDate, endDate] as const,
    trackDetails: (trackId: string, startDate: string, endDate: string) => [...analyticsKeys.all, 'track', trackId, startDate, endDate] as const,
    curatorPlaylist: (playlistId: string, startDate: string, endDate: string) => [...analyticsKeys.all, 'curator', playlistId, startDate, endDate] as const,
    adminPlatform: (startDate: string, endDate: string) => [...analyticsKeys.all, 'admin', 'platform', startDate, endDate] as const,
    listeningHistory: (page: number) => [...analyticsKeys.all, 'history', page] as const,
};

export const useArtistOverview = (startDate: string, endDate: string) => {
    return useQuery({
        queryKey: analyticsKeys.artistOverview(startDate, endDate),
        queryFn: () => analyticsApi.getArtistOverview(startDate, endDate),
        staleTime: 5 * 60 * 1000,
    });
};

export const useTrackAnalytics = (trackId: string | undefined, startDate: string, endDate: string) => {
    return useQuery({
        queryKey: analyticsKeys.trackDetails(trackId!, startDate, endDate),
        queryFn: () => analyticsApi.getTrackAnalytics(trackId!, startDate, endDate),
        enabled: !!trackId,
        staleTime: 60 * 1000,
    });
};

export const useCuratorAnalytics = (playlistId: string | undefined, startDate: string, endDate: string) => {
    return useQuery({
        queryKey: analyticsKeys.curatorPlaylist(playlistId!, startDate, endDate),
        queryFn: () => analyticsApi.getCuratorPlaylistAnalytics(playlistId!, startDate, endDate),
        enabled: !!playlistId,
    });
};

export const usePlatformAnalytics = (startDate: string, endDate: string) => {
    return useQuery({
        queryKey: analyticsKeys.adminPlatform(startDate, endDate),
        queryFn: () => analyticsApi.getPlatformOverview(startDate, endDate),
        staleTime: 10 * 60 * 1000,
    });
};

export const useExportTrackCsv = () => {
    return useMutation({
        mutationFn: ({trackId, startDate, endDate}: { trackId: string, startDate: string, endDate: string }) =>
            analyticsApi.exportTrackCsv(trackId, startDate, endDate),
        onSuccess: (blob, variables) => {
            // Create a temporary link to trigger the browser's download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Format the filename to reflect the selected range
            const shortStart = variables.startDate.split('T')[0];
            const shortEnd = variables.endDate.split('T')[0];
            a.download = `track_analytics_${variables.trackId}_${shortStart}_to_${shortEnd}.csv`;
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


export const useForceHourlyRollup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({start, end}: { start?: string; end?: string }) =>
            telemetryAdminApi.forceHourlyRollup(start, end),
        onSuccess: () => {
            queryClient.invalidateQueries(); // Invalidate all analytics data to refresh UI
        }
    });
};

export const useForceDailyRollup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({start, end}: { start?: string; end?: string }) =>
            telemetryAdminApi.forceDailyRollup(start, end),
        onSuccess: () => {
            queryClient.invalidateQueries();
        }
    });
};

export const useSyncTotals = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => telemetryAdminApi.syncTotals(),
        onSuccess: () => {
            queryClient.invalidateQueries();
        }
    });
};

export const useTriggerSemanticReindex = () => {
    return useMutation({
        mutationFn: () => telemetryAdminApi.triggerSemanticReindex(),
    });
};