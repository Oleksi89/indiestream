import {apiClient} from '@/shared/api/apiClient';
import type {AdminUserViewDto, AdminUserFilters, PageResponse} from '../../../types';
import type {AxiosResponse} from 'axios';

export const adminUsersApi = {
    searchUsers: async (filters: AdminUserFilters): Promise<PageResponse<AdminUserViewDto>> => {
        const params = new URLSearchParams();
        if (filters.q) params.append('q', filters.q);
        if (filters.isBanned !== undefined && filters.isBanned !== null) {
            params.append('isBanned', String(filters.isBanned));
        }
        if (filters.sort) params.append('sort', filters.sort);
        params.append('page', String(filters.page));
        params.append('size', String(filters.size));

        const {data} = await apiClient.get<unknown, AxiosResponse<PageResponse<AdminUserViewDto>>>(
            `/users/admin/search?${params.toString()}`
        );
        return data;
    },

    banUser: async (userId: string, reason: string): Promise<void> => {
        await apiClient.post(`/users/admin/${userId}/ban`, null, {params: {reason}});
    },

    unbanUser: async (userId: string, reason: string): Promise<void> => {
        await apiClient.post(`/users/admin/${userId}/unban`, null, {params: {reason}});
    }
};