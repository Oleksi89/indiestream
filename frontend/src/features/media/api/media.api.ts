import {apiClient} from '@/shared/api/apiClient';
import type {TrackDto, PageResponse, StemUploadPayload} from '../types';
import type {AxiosResponse} from 'axios';

export const mediaApi = {
    /**
     * Uploads an audio file, cover image, and dynamic stems to the storage layer.
     * FormData handles parallel arrays natively by appending multiple values to the same key.
     */
    uploadTrack: async (
        artistId: string,
        title: string,
        file: File,
        cover?: File,
        stems: StemUploadPayload[] = []
    ): Promise<TrackDto> => {
        const formData = new FormData();
        formData.append('artistId', artistId);
        formData.append('title', title);
        formData.append('file', file);

        if (cover) {
            formData.append('cover', cover);
        }

        stems.forEach(stem => {
            formData.append('stemFiles', stem.file);
            formData.append('stemNames', stem.name);
        });

        const {data} = await apiClient.post<unknown, AxiosResponse<TrackDto>>(
            '/tracks',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return data;
    },

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
};