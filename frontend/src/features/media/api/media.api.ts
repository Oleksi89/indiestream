import {apiClient} from '@/shared/api/apiClient';
import type {TrackDto, PageResponse} from '../types';
import type {AxiosResponse} from 'axios';

export const mediaApi = {
    /**
     * Uploads an audio file and an optional cover image to the storage layer.
     */
    uploadTrack: async (artistId: string, title: string, file: File, cover?: File): Promise<TrackDto> => {
        const formData = new FormData();
        formData.append('artistId', artistId);
        formData.append('title', title);
        formData.append('file', file);

        if (cover) {
            formData.append('cover', cover);
        }

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
            {
                params: {
                    artistId,
                    page,
                    size
                }
            }
        );
        return data;
    },

    getPublicTracks: async (page: number = 0, size: number = 20): Promise<PageResponse<TrackDto>> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<PageResponse<TrackDto>>>(
            `/tracks`,
            {
                params: {page, size}
            }
        );
        return data;
    },

    /**
     * Fetches the image as a Blob securely using the JWT token interceptor.
     * Returns a local object URL that can be used directly in an <img> src attribute.
     */
    getTrackCoverUrl: async (trackId: string): Promise<string> => {
        const response = await apiClient.get(`/tracks/${trackId}/cover`, {
            responseType: 'blob' // tells Axios to treat the response as binary data
        });
        return URL.createObjectURL(response.data);
    }
};