import {apiClient} from '@/shared/api/apiClient';
import type {GlobalSearchResponseDto} from '../types';
import type {AxiosResponse} from 'axios';

export const searchApi = {
    /**
     * Executes a fast search optimized for the Navbar dropdown.
     */
    quickSearch: async (query: string, limit: number = 3): Promise<GlobalSearchResponseDto> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<GlobalSearchResponseDto>>('/search', {
            params: {q: query, limit}
        });
        return data;
    },

    /**
     * Executes a comprehensive search handling exact tags or flexible text queries.
     */
    fullSearch: async (query: string, genre?: string, tags?: string, limit: number = 20): Promise<GlobalSearchResponseDto> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<GlobalSearchResponseDto>>('/search', {
            params: {q: query, genre, tags, limit}
        });
        return data;
    }
};