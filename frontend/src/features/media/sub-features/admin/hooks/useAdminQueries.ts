import {useQuery} from '@tanstack/react-query';
import {adminApi, type AdminRegistryFilters} from '../api/admin.api';
import {keepPreviousData} from '@tanstack/react-query';

export const adminKeys = {
    all: ['admin'] as const,
    registry: (filters: AdminRegistryFilters) => [...adminKeys.all, 'registry', filters] as const,
    queue: (page: number) => [...adminKeys.all, 'queue', page] as const,
    details: (trackId: string) => [...adminKeys.all, 'details', trackId] as const,
};

export const useGlobalAdminTracks = (filters: AdminRegistryFilters) => {
    return useQuery({
        queryKey: adminKeys.registry(filters),
        queryFn: () => adminApi.getGlobalRegistry(filters),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60, // 1 minute freshness
    });
};

export const useAdminTrackDetails = (trackId: string) => {
    return useQuery({
        queryKey: adminKeys.details(trackId),
        queryFn: () => adminApi.getTrackDetails(trackId),
        enabled: !!trackId,
    });
};

export const useAdminTrackAnalytics = (trackId: string | undefined, startDate: string, endDate: string) => {
    return useQuery({
        queryKey: [...adminKeys.all, 'track-analytics', trackId, startDate, endDate],
        queryFn: () => adminApi.getAdminTrackAnalytics(trackId!, startDate, endDate),
        enabled: !!trackId,
        staleTime: 60 * 1000,
    });
};