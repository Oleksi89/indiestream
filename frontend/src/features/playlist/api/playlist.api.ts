import {apiClient} from '@/shared/api/apiClient';
import type {AxiosResponse} from 'axios';
import type {PlaylistDto, CreatePlaylistPayload, UpdatePlaylistPayload, PageResponse, PlaylistTrackDto} from '../types';

export const playlistApi = {
    /**
     * Fetches the user's library combining owned, followed, and collaborated playlists.
     */
    getUserLibrary: async (page: number = 0, size: number = 20): Promise<PageResponse<PlaylistDto>> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<PageResponse<PlaylistDto>>>('/playlists/library', {
            params: {page, size},
        });
        return data;
    },

    getPlaylist: async (playlistId: string): Promise<PlaylistDto> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<PlaylistDto>>(`/playlists/${playlistId}`);
        return data;
    },

    getPlaylistTracks: async (playlistId: string, page: number = 0, size: number = 50): Promise<PageResponse<PlaylistTrackDto>> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<PageResponse<PlaylistTrackDto>>>(`/playlists/${playlistId}/tracks`, {
            params: {page, size},
        });
        return data;
    },

    getSystemLikedTracks: async (): Promise<PlaylistDto> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<PlaylistDto>>('/playlists/me/liked');
        return data;
    },

    createPlaylist: async (payload: CreatePlaylistPayload): Promise<PlaylistDto> => {
        const {data} = await apiClient.post<unknown, AxiosResponse<PlaylistDto>>('/playlists', payload);
        return data;
    },

    updatePlaylist: async (playlistId: string, payload: UpdatePlaylistPayload): Promise<PlaylistDto> => {
        const {data} = await apiClient.put<unknown, AxiosResponse<PlaylistDto>>(`/playlists/${playlistId}`, payload);
        return data;
    },

    deletePlaylist: async (playlistId: string): Promise<void> => {
        await apiClient.delete(`/playlists/${playlistId}`);
    },

    duplicatePlaylist: async (playlistId: string): Promise<PlaylistDto> => {
        const {data} = await apiClient.post<unknown, AxiosResponse<PlaylistDto>>(`/playlists/${playlistId}/duplicate`);
        return data;
    },

    addTrack: async (playlistId: string, trackId: string): Promise<void> => {
        await apiClient.post(`/playlists/${playlistId}/tracks/${trackId}`);
    },

    removeTrack: async (playlistId: string, trackId: string): Promise<void> => {
        await apiClient.delete(`/playlists/${playlistId}/tracks/${trackId}`);
    },

    // --- Social Collaboration Features ---

    addCollaborator: async (playlistId: string, collaboratorId: string): Promise<void> => {
        await apiClient.post(`/playlists/${playlistId}/collaborators/${collaboratorId}`);
    },

    removeCollaborator: async (playlistId: string, collaboratorId: string): Promise<void> => {
        await apiClient.delete(`/playlists/${playlistId}/collaborators/${collaboratorId}`);
    },

    followPlaylist: async (playlistId: string): Promise<void> => {
        await apiClient.post(`/playlists/${playlistId}/followers`);
    },

    unfollowPlaylist: async (playlistId: string): Promise<void> => {
        await apiClient.delete(`/playlists/${playlistId}/followers`);
    }
};