import {apiClient} from '@/shared/api/apiClient';
import type {PageResponse, UserProfileResponse, UserSummaryDto} from '@/features/auth/types';

export interface UpdateProfileRequest {
    alias?: string;
    bio?: string;
    isPrivate?: boolean;
    hideSubscriptions?: boolean;
}

export const profileApi = {
    getProfile: async (username: string): Promise<UserProfileResponse> => {
        const response = await apiClient.get<UserProfileResponse>(`/users/${username}/profile`);
        return response.data;
    },

    updateProfileText: async (data: UpdateProfileRequest): Promise<UserProfileResponse> => {
        const response = await apiClient.put<UserProfileResponse>('/users/me/profile', data);
        return response.data;
    },

    updateAvatar: async (file: File): Promise<UserProfileResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<UserProfileResponse>('/users/me/avatar', formData, {
            headers: {'Content-Type': 'multipart/form-data'},
        });
        return response.data;
    },

    updateBanner: async (file: File): Promise<UserProfileResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<UserProfileResponse>('/users/me/banner', formData, {
            headers: {'Content-Type': 'multipart/form-data'},
        });
        return response.data;
    },

    getAvatarBlob: async (username: string): Promise<Blob> => {
        const response = await apiClient.get(`/users/${username}/avatar`, {
            responseType: 'blob'
        });
        return response.data;
    },

    getBannerBlob: async (username: string): Promise<Blob> => {
        const response = await apiClient.get(`/users/${username}/banner`, {
            responseType: 'blob'
        });
        return response.data;
    },

    followUser: async (username: string): Promise<void> => {
        await apiClient.post(`/users/${username}/follow`);
    },

    unfollowUser: async (username: string): Promise<void> => {
        await apiClient.delete(`/users/${username}/follow`);
    },

    getFollowers: async (username: string, page = 0, size = 20): Promise<PageResponse<UserSummaryDto>> => {
        const response = await apiClient.get<PageResponse<UserSummaryDto>>(`/users/${username}/followers`, {
            params: {page, size}
        });
        return response.data;
    },

    getFollowing: async (username: string, page = 0, size = 20): Promise<PageResponse<UserSummaryDto>> => {
        const response = await apiClient.get<PageResponse<UserSummaryDto>>(`/users/${username}/following`, {
            params: {page, size}
        });
        return response.data;
    },
};