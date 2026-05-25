import {apiClient} from '@/shared/api/apiClient';
import type {AxiosResponse} from 'axios';
import type {LibraryItemDto} from '../types';

export const libraryApi = {
    getMyLibrary: async (): Promise<LibraryItemDto[]> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<LibraryItemDto[]>>('/library/me');
        return data;
    }
};