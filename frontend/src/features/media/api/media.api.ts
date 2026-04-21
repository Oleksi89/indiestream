import {apiClient} from '@/shared/api/apiClient';
import type {TrackDto} from '../types';
import type {AxiosResponse} from 'axios';

export const mediaApi = {
    uploadTrack: async (artistId: string, title: string, file: File): Promise<TrackDto> => {
        const formData = new FormData();
        formData.append('artistId', artistId);
        formData.append('title', title);
        formData.append('file', file);

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
};