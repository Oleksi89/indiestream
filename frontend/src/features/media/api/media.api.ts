import {apiClient} from '@/shared/api/apiClient';
import type {TrackDto, PageResponse, StemUploadPayload} from '../types';
import type {AxiosResponse, AxiosProgressEvent} from 'axios';

export interface UploadTrackPayload {
    artistId: string;
    title: string;
    file: File;
    cover?: File | null;
    stems?: StemUploadPayload[];
    genre?: string;
    isExplicit?: boolean;
    customTags?: string[];
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
}

export interface UpdateTrackPayload {
    title?: string;
    genre?: string;
    isExplicit?: boolean;
    customTags?: string[];
    cover?: File | null; // null explicitly means "remove cover"
}

export const mediaApi = {
    uploadTrack: async (payload: UploadTrackPayload): Promise<TrackDto> => {
        const formData = new FormData();

        // Safe appending to prevent native FormData errors
        formData.append('artistId', payload.artistId || '');
        formData.append('title', payload.title || 'Untitled');
        formData.append('file', payload.file);

        if (payload.cover instanceof File) {
            formData.append('cover', payload.cover);
        }

        if (payload.stems && payload.stems.length > 0) {
            payload.stems.forEach(stem => {
                // Double check to ensure empty placeholders aren't sent
                if (stem.file instanceof File && stem.name.trim()) {
                    formData.append('stemFiles', stem.file);
                    formData.append('stemNames', stem.name.trim());
                }
            });
        }

        if (payload.genre) formData.append('genre', payload.genre);
        if (payload.isExplicit !== undefined) formData.append('isExplicit', String(payload.isExplicit));
        if (payload.customTags && payload.customTags.length > 0) {
            payload.customTags.forEach(tag => formData.append('customTags', tag));
        }

        const {data} = await apiClient.post<unknown, AxiosResponse<TrackDto>>(
            '/tracks',
            formData,
            {
                headers: {'Content-Type': 'multipart/form-data'},
                onUploadProgress: payload.onUploadProgress,
                timeout: 0 // For large uploads
            }
        );
        return data;
    },

    /**
     * Updates an existing track's metadata and/or cover art.
     */
    updateTrackDetails: async (trackId: string, payload: UpdateTrackPayload): Promise<TrackDto> => {
        const formData = new FormData();

        if (payload.title) formData.append('title', payload.title);
        if (payload.genre) formData.append('genre', payload.genre);
        if (payload.isExplicit !== undefined) formData.append('isExplicit', String(payload.isExplicit));
        if (payload.customTags && payload.customTags.length > 0) {
            payload.customTags.forEach(tag => formData.append('customTags', tag));
        }
        if (payload.cover instanceof File) {
            formData.append('cover', payload.cover);
        }

        const {data} = await apiClient.patch<unknown, AxiosResponse<TrackDto>>(
            `/tracks/${trackId}`,
            formData,
            {headers: {'Content-Type': 'multipart/form-data'}}
        );
        return data;
    },

    // --- Lifecycle Management Endpoints ---

    publishTrack: async (trackId: string): Promise<void> => {
        await apiClient.post(`/tracks/${trackId}/publish`);
    },

    toggleVisibility: async (trackId: string): Promise<void> => {
        await apiClient.patch(`/tracks/${trackId}/visibility`);
    },

    archiveTrack: async (trackId: string): Promise<void> => {
        // Maps to the soft delete backend architecture
        await apiClient.delete(`/tracks/${trackId}`);
    },

    // --- Query Endpoints ---

     /**
     * Fetches a paginated list of tracks for a specific artist.
     */
    getArtistTracks: async (artistId: string, page: number = 0, size: number = 10): Promise<PageResponse<TrackDto>> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<PageResponse<TrackDto>>>(
            `/tracks`,
            {params: {artistId, page, size}}
        );
        return data;
    },

    getStudioTracks: async (page: number = 0, size: number = 20): Promise<PageResponse<TrackDto>> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<PageResponse<TrackDto>>>(
            `/tracks/studio`,
            {params: {page, size}}
        );
        return data;
    },

    // For Wizard Phase polling
    getTrack: async (trackId: string): Promise<TrackDto> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<TrackDto>>(`/tracks/${trackId}`);
        return data;
    },

    /**
     * Fetches the global paginated feed of all public tracks.
     */
    getPublicTracks: async (page: number = 0, size: number = 20): Promise<PageResponse<TrackDto>> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<PageResponse<TrackDto>>>(
            `/tracks`,
            {params: {page, size}}
        );
        return data;
    },

    /**
     * Fetches the image as a Blob securely using the JWT.
     */
    getTrackCoverBlob: async (trackId: string): Promise<Blob> => {
        const response = await apiClient.get(`/tracks/${trackId}/cover`, {
            responseType: 'blob'
        });
        return response.data;
    },

    /**
     * Fetches the audio file as a Blob using the authenticated apiClient.
     */
    getTrackAudioBlob: async (trackId: string): Promise<Blob> => {
        const response = await apiClient.get(`/tracks/${trackId}/stream`, {
            responseType: 'blob'
        });
        return response.data;
    },

    /**
     * Fetches a specific stem audio file as a Blob.
     * Required for loading into the Web Audio API ArrayBuffer.
     */
    getStemAudioBlob: async (trackId: string, stemName: string): Promise<Blob> => {
        const response = await apiClient.get(`/tracks/${trackId}/stems/${stemName}`, {
            responseType: 'blob'
        });
        return response.data;
    },

    /**
     * Generates the absolute URL for an HLS manifest.
     * Required because hls.js bypasses the Axios interceptor logic.
     */
    getHlsManifestUrl: (trackId: string, type: 'master' | 'stems', stemName?: string): string => {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
        if (type === 'master') {
            return `${baseUrl}/tracks/${trackId}/hls/master/index.m3u8`;
        }
        return `${baseUrl}/tracks/${trackId}/hls/stems/${stemName}/index.m3u8`;
    }
};