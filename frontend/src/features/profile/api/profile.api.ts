import {apiClient} from '@/shared/api/apiClient';
import type {UserDto, PageResponse} from '@/features/auth/types';

export interface UpdateProfileRequest {
    bio?: string;
    isPrivate?: boolean;
    hideSubscriptions?: boolean;
}

export const profileApi = {
    getProfile: async (username: string): Promise<UserDto> => {
        const response = await apiClient.get<UserDto>(`/users/${username}/profile`);
        return response.data;
    },

    updateProfileText: async (data: UpdateProfileRequest): Promise<UserDto> => {
        const response = await apiClient.put<UserDto>('/users/me/profile', data);
        return response.data;
    },

    updateAvatar: async (file: File): Promise<UserDto> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<UserDto>('/users/me/avatar', formData, {
            headers: {'Content-Type': 'multipart/form-data'},
        });
        return response.data;
    },

    updateBanner: async (file: File): Promise<UserDto> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<UserDto>('/users/me/banner', formData, {
            headers: {'Content-Type': 'multipart/form-data'},
        });
        return response.data;
    },

    followUser: async (username: string): Promise<void> => {
        await apiClient.post(`/users/${username}/follow`);
    },

    unfollowUser: async (username: string): Promise<void> => {
        await apiClient.delete(`/users/${username}/follow`);
    },

    getFollowers: async (username: string, page = 0, size = 20): Promise<PageResponse<UserDto>> => {
        const response = await apiClient.get<PageResponse<UserDto>>(`/users/${username}/followers`, {
            params: {page, size}
        });
        return response.data;
    },
};